from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="CareerPilot AI - AI-powered Resume Analysis and Career Assistant",
    version="1.0.0",
)

# Set all CORS enabled origins
from app.api.routers import auth, resume, chat, analysis
from app.db.base_class import Base
from app.db.session import engine

# Create tables (for dev, use alembic for prod)
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(resume.router, prefix=f"{settings.API_V1_STR}/resume", tags=["resume"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(analysis.router, prefix=f"{settings.API_V1_STR}/analysis", tags=["analysis"])

@app.get("/")
def root():
    return {"message": "Welcome to CareerPilot AI API"}
