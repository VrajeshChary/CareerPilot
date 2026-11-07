from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.base_class import Base
from app.db.session import engine
from app.api.routers import auth, resume, chat, analysis, applications
from app.services.llm_service import LLMService

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="CareerPilot AI - Elite AI Resume Analysis and Career Intelligence Engine",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(resume.router, prefix=f"{settings.API_V1_STR}/resume", tags=["resume"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(analysis.router, prefix=f"{settings.API_V1_STR}/analysis", tags=["analysis"])
app.include_router(applications.router, prefix=f"{settings.API_V1_STR}/applications", tags=["applications"])

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "version": "2.1.0",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get(f"{settings.API_V1_STR}/system/status")
def system_status():
    return {
        "active_provider": LLMService.get_active_provider(),
        "has_gemini": bool(settings.GEMINI_API_KEY),
        "has_openrouter": bool(settings.OPENROUTER_API_KEY),
        "has_openai": bool(settings.OPENAI_API_KEY),
        "has_groq": bool(settings.GROQ_API_KEY),
        "vector_db": "ChromaDB (Local Persistent)",
        "status": "ready"
    }
