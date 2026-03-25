from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    gemini_api_key: str = Field(..., alias="GEMINI_API_KEY")
    supabase_url: str = Field(..., alias="SUPABASE_URL")
    supabase_service_role_key: str = Field(..., alias="SUPABASE_SERVICE_ROLE_KEY")
    google_client_id: str = Field(..., alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(..., alias="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str = Field(..., alias="GOOGLE_REDIRECT_URI")
    frontend_url: str = Field(default="http://localhost:3000", alias="FRONTEND_URL")
    gmail_token_encryption_key: str | None = Field(default=None, alias="GMAIL_TOKEN_ENCRYPTION_KEY")


@lru_cache
def get_settings() -> Settings:
    return Settings()
