from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "MeroDaktar API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database Settings
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASS: str
    DB_NAME: str

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+psycopg://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # Redis Settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # JWT Settings
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI API Keys
    OPENAI_API_KEY: str
    GEMINI_API_KEY: str
    
    # MedGemma Configuration
    MEDGEMMA_BASE_URL: str = "https://e6r5j02wqcigw3lp.us-east-1.aws.endpoints.huggingface.cloud/v1/"
    MEDGEMMA_API_KEY: str = ""
    MEDGEMMA_MODEL: str = "Utshav/medgemma-nepali-fp16"
    
    # Legacy Hugging Face settings (kept for backward compatibility)
    HF_TOKEN: str = ""  # Hugging Face token (deprecated, use MEDGEMMA_API_KEY)
    MEDGEMMA_ENDPOINT: str = ""  # MedGemma endpoint URL (deprecated, use MEDGEMMA_BASE_URL)

    # AI Backend Selection
    AI_BACKEND: str = "openai"  # Options: "openai" or "medgemma"

    # CORS Settings
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> list:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
