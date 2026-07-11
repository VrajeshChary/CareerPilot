from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CareerPilot AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "supersecretkey_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    DATABASE_URL: str = "sqlite:///./sql_app.db"
    CHROMA_DB_DIR: str = "./chroma_db"
    
    # LLM API Keys
    GEMINI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    
    class Config:
        env_file = ".env"

settings = Settings()
