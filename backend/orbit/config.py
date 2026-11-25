from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ORBIT_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://orbit:orbit@localhost:5432/orbit"
    cookie_name: str = "orbit_session"
    cookie_secure: bool = True
    session_ttl_hours: int = 12
    login_max_failures: int = 5
    login_lock_minutes: int = 15


@lru_cache
def get_settings() -> Settings:
    return Settings()
