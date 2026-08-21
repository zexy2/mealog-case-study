import os
from dataclasses import dataclass


def _truthy(value: str | None) -> bool:
    """Explicit allow-list. An unset or unrecognised value is False.

    A legal control must not be switched on by a typo, and it must not be
    switched *off* by one either -- so the parse is exact rather than lenient.
    """
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    vision_provider: str = os.getenv("VISION_PROVIDER", "fixture")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or None
    default_locale: str = os.getenv("DEFAULT_LOCALE", "en_US")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    #: Commercial deployment. Defaults to **off** so development, tests and the
    #: offline eval behave exactly as before. Turning it on makes
    #: `locales.loader.load()` refuse any pack whose data licence does not
    #: permit commercial use -- see AGENTS.md section 9 and issue #8.
    commercial_mode: bool = _truthy(os.getenv("MEALOG_COMMERCIAL_MODE"))

    def validated(self) -> "Settings":
        if self.vision_provider == "gemini" and not self.gemini_api_key:
            raise RuntimeError(
                "VISION_PROVIDER=gemini requires GEMINI_API_KEY. "
                "Use VISION_PROVIDER=fixture to run fully offline."
            )
        return self


settings = Settings()
