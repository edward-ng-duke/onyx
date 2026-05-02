"""Wire-level contract tests for the i18n `language` field on
`PersonalizationUpdateRequest` and `UserPersonalization`.

These pin the Pydantic schema so that:
  - The frontend `setLanguage("zh")` call cannot regress to a 422.
  - Bogus locales (`"fr"`, `""`, `1`, etc.) ARE rejected at the boundary.
  - Adding a locale to the front-end without updating the backend schema
    surfaces as a test failure here, not a silent runtime drop.

Persistence to the DB is intentionally out of scope (see web i18n follow-up
T4 / T4-bis). When that lands, extend this file with a round-trip case via
the integration suite.
"""

import pytest
from pydantic import ValidationError

from onyx.server.manage.models import PersonalizationUpdateRequest
from onyx.server.manage.models import UserPersonalization


class TestPersonalizationUpdateRequestLanguage:
    def test_accepts_zh(self) -> None:
        req = PersonalizationUpdateRequest(language="zh")
        assert req.language == "zh"

    def test_accepts_en(self) -> None:
        req = PersonalizationUpdateRequest(language="en")
        assert req.language == "en"

    def test_accepts_explicit_none(self) -> None:
        req = PersonalizationUpdateRequest(language=None)
        assert req.language is None

    def test_defaults_to_none_when_omitted(self) -> None:
        req = PersonalizationUpdateRequest()
        assert req.language is None

    @pytest.mark.parametrize("bad_value", ["fr", "", "EN", "zh-CN", "  zh  "])
    def test_rejects_unsupported_locale(self, bad_value: str) -> None:
        with pytest.raises(ValidationError):
            PersonalizationUpdateRequest(language=bad_value)

    def test_rejects_non_string(self) -> None:
        with pytest.raises(ValidationError):
            PersonalizationUpdateRequest(language=1)  # type: ignore[arg-type]


class TestUserPersonalizationLanguage:
    """Mirror tests on the read-side schema, for symmetry."""

    def test_accepts_zh(self) -> None:
        p = UserPersonalization(language="zh")
        assert p.language == "zh"

    def test_defaults_to_none_when_omitted(self) -> None:
        p = UserPersonalization()
        assert p.language is None

    def test_rejects_unsupported_locale(self) -> None:
        with pytest.raises(ValidationError):
            UserPersonalization(language="fr")
