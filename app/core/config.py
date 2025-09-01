# app/core/config.py
from typing import List, Optional
from pydantic_settings import BaseSettings  # <-- change here

class Settings(BaseSettings):
    GITHUB_TOKEN: Optional[str] = None
    ALLOW_ORIGINS: List[str] = ["*"]
    STATIC_DIR: str = "static"
    USER_AGENT: str = "Repo-Analyzer/1.0"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
