# app/core/config.py - Complete configuration with authentication
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Existing GitHub settings
    GITHUB_TOKEN: Optional[str] = None
    ALLOW_ORIGINS: List[str] = ["*"]
    STATIC_DIR: str = "static"
    USER_AGENT: str = "Repo-Analyzer/1.0"
    
    # MongoDB settings
    MONGO_URI: str = ""
    MONGO_DB: str = "repo_analyzer"
    
    # JWT settings
    JWT_SECRET: str = "your_super_secret_jwt_key_change_this_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Google OAuth settings
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    
    # Email settings (optional)
    EMAIL_FROM: Optional[str] = None
    EMAIL_USERNAME: Optional[str] = None
    EMAIL_PASSWORD: Optional[str] = None
    EMAIL_HOST: Optional[str] = "smtp.gmail.com"
    EMAIL_PORT: int = 587

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()