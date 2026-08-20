import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    vision_provider: str = os.getenv("VISION_PROVIDER", "fixture")
    gemini_api_key: str | None = os.getenv("GEMINI_API_KEY") or None
    default_locale: str = os.getenv("DEFAULT_LOCALE", "en_US")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    def validated(self) -> "Settings":
        if self.vision_provider == "gemini" and not self.gemini_api_key:
            raise RuntimeError(
                "VISION_PROVIDER=gemini requires GEMINI_API_KEY. "
                "Use VISION_PROVIDER=fixture to run fully offline."
            )
        return self


settings = Settings()
