"""Re-export shared external-dependency mocks for chat tests.

The fixtures themselves live in ``tests/external_dependency_unit/answer/conftest.py``
so that the answer-stream and chat tests stay in lockstep on what they mock.
"""

from tests.external_dependency_unit.answer.conftest import (
    mock_external_deps as mock_external_deps,
)
from tests.external_dependency_unit.answer.conftest import (
    mock_file_store as mock_file_store,
)
from tests.external_dependency_unit.answer.conftest import (
    mock_gpu_status as mock_gpu_status,
)
from tests.external_dependency_unit.answer.conftest import (
    mock_nlp_embeddings_post as mock_nlp_embeddings_post,
)
from tests.external_dependency_unit.answer.conftest import (
    mock_vespa_query as mock_vespa_query,
)
