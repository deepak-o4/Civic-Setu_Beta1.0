import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicSetu Backend"
    VERSION: str = "1.0.0"
    SECRET_KEY: str
    API_V1_STR: str = "/api/v1"
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "complaint_db")
    # Optional: a single hosted-Postgres connection string (Neon, Supabase,
    # Render Postgres, etc. all hand you one of these instead of discrete
    # user/password/host/port/db values). When set, this takes priority over
    # the POSTGRES_* fields above and is always connected to over SSL, since
    # every such provider requires it. Leave unset for local/Docker Compose
    # Postgres, which keeps working exactly as before.
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_SECRET_KEY: str = os.getenv("REFRESH_SECRET_KEY", "fallback_refresh_secret")
    
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAILS_FROM_EMAIL: str = os.getenv("EMAILS_FROM_EMAIL", "no-reply@civicsetu.gov.in")
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")

    # AWS S3 Storage settings
    S3_BUCKET: str = os.getenv("S3_BUCKET", "")
    S3_ENDPOINT_URL: str = os.getenv("S3_ENDPOINT_URL", "")
    S3_ACCESS_KEY: str = os.getenv("S3_ACCESS_KEY", "")
    S3_SECRET_KEY: str = os.getenv("S3_SECRET_KEY", "")
    S3_REGION: str = os.getenv("S3_REGION", "us-east-1")
    
    USE_SQLITE: str = os.getenv("USE_SQLITE", "false")

    # Groq Settings
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Redis & Celery config
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0")

    # Comma-separated list of additional allowed CORS origins for production
    # frontends (e.g. "https://civicsetu.vercel.app"). Local dev origins and
    # the devtunnels/Codespaces regex in main.py are always allowed on top of
    # this — leave unset and nothing changes for local/Docker Compose use.
    FRONTEND_ORIGINS: str = os.getenv("FRONTEND_ORIGINS", "")

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.USE_SQLITE.lower() == "true":
            return "sqlite+aiosqlite:///./test.db"

        if self.DATABASE_URL:
            # Normalize a hosted-provider connection string to the asyncpg
            # driver. Query params like "?sslmode=require" are stripped here
            # because SSL is enabled explicitly via connect_args in
            # db/session.py and alembic/env.py instead — asyncpg doesn't
            # understand the psycopg-style "sslmode" query key.
            url = self.DATABASE_URL.split("?")[0]
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            if not url.startswith("postgresql+asyncpg://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url

        db_name = self.POSTGRES_DB
        if "PYTEST_CURRENT_TEST" in os.environ:
            db_name = "civicsetu_test"
        # We enforce asyncpg for the database connection
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{db_name}"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
