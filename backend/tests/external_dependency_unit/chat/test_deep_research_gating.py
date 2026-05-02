import os
import uuid

from sqlalchemy.orm import Session

from onyx.chat.models import StreamingError
from onyx.chat.process_message import handle_stream_message_objects
from onyx.db.chat import create_chat_session
from onyx.db.llm import update_default_provider
from onyx.db.llm import upsert_llm_provider
from onyx.db.models import User
from onyx.db.persona import upsert_persona
from onyx.deep_research.dr_loop import MIN_DEEP_RESEARCH_INPUT_TOKENS
from onyx.error_handling.error_codes import OnyxErrorCode
from onyx.llm.constants import LlmProviderNames
from onyx.server.manage.llm.models import LLMProviderUpsertRequest
from onyx.server.manage.llm.models import ModelConfigurationUpsertRequest
from onyx.server.query_and_chat.models import SendMessageRequest
from tests.external_dependency_unit.conftest import create_test_user

SMALL_CONTEXT_TOKENS = 8_000


def _setup_small_context_llm_provider(db_session: Session) -> None:
    request = LLMProviderUpsertRequest(
        name=f"small-context-provider-{uuid.uuid4().hex[:8]}",
        provider=LlmProviderNames.OPENAI,
        api_key=os.environ.get("OPENAI_API_KEY", "test"),
        is_public=True,
        model_configurations=[
            ModelConfigurationUpsertRequest(
                name="gpt-4o-mini",
                is_visible=True,
                max_input_tokens=SMALL_CONTEXT_TOKENS,
            )
        ],
        groups=[],
    )
    provider = upsert_llm_provider(
        llm_provider_upsert_request=request,
        db_session=db_session,
    )
    update_default_provider(provider.id, "gpt-4o-mini", db_session)


def test_deep_research_rejects_small_context_llm(
    db_session: Session,
    full_deployment_setup: None,  # noqa: ARG001
    mock_external_deps: None,  # noqa: ARG001
) -> None:
    """Deep Research must reject LLMs whose context is below MIN_DEEP_RESEARCH_INPUT_TOKENS
    by emitting a clean QUERY_REJECTED StreamingError, not a generic MODEL_ERROR with
    a stack trace.
    """
    assert SMALL_CONTEXT_TOKENS < MIN_DEEP_RESEARCH_INPUT_TOKENS

    _setup_small_context_llm_provider(db_session)

    test_user: User = create_test_user(db_session, email_prefix="deep_research_gate")

    test_persona = upsert_persona(
        user=None,
        name=f"Deep Research Gate Persona {uuid.uuid4()}",
        description="Persona for deep-research small-context-LLM gating test",
        llm_model_provider_override=None,
        llm_model_version_override=None,
        starter_messages=None,
        system_prompt=None,
        task_prompt=None,
        datetime_aware=None,
        is_public=True,
        db_session=db_session,
        tool_ids=[],
        document_set_ids=None,
        is_listed=True,
    )

    chat_session = create_chat_session(
        db_session=db_session,
        description="Deep research gate test",
        user_id=test_user.id,
        persona_id=test_persona.id,
    )

    chat_request = SendMessageRequest(
        message="Investigate Onyx",
        chat_session_id=chat_session.id,
        deep_research=True,
    )

    streaming_errors: list[StreamingError] = []
    for packet in handle_stream_message_objects(
        new_msg_req=chat_request,
        user=test_user,
        db_session=db_session,
    ):
        if isinstance(packet, StreamingError):
            streaming_errors.append(packet)

    assert streaming_errors, (
        "Expected at least one StreamingError for deep-research with small-context LLM, "
        "got none."
    )

    rejection_errors = [
        e for e in streaming_errors if e.error_code == OnyxErrorCode.QUERY_REJECTED.code
    ]
    assert len(rejection_errors) == 1, (
        f"Expected exactly one QUERY_REJECTED StreamingError, got "
        f"{[e.error_code for e in streaming_errors]}"
    )

    rejection = rejection_errors[0]
    assert rejection.is_retryable is False, (
        "QUERY_REJECTED is a permanent rejection; is_retryable must be False so the "
        "frontend does not show a Retry affordance."
    )
    assert (
        "50,000" in rejection.error
    ), f"Error message should reference the 50,000-token threshold; got: {rejection.error!r}"
    assert (
        rejection.stack_trace is None
    ), "QUERY_REJECTED responses must not leak a stack trace to the client."

    assert not any(
        e.error_code == "MODEL_ERROR" for e in streaming_errors
    ), "Small-context rejection must not be tagged as MODEL_ERROR."
