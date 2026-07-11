from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from app.api import deps
from app.models.user import User
from app.rag.engine import get_vectorstore
from app.core.config import settings

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    llm_provider: str = "openrouter"  # openrouter, gemini

def get_llm(provider: str):
    if provider == "gemini":
        return ChatGoogleGenerativeAI(google_api_key=settings.GEMINI_API_KEY, model="gemini-1.5-pro")
    else:
        # Default to OpenRouter Nemotron
        return ChatOpenAI(
            api_key=settings.OPENROUTER_API_KEY, 
            base_url="https://openrouter.ai/api/v1",
            model="nvidia/nemotron-3-ultra-550b-a55b:free"
        )

@router.post("/")
async def chat_with_resume(
    request: ChatRequest,
    current_user: User = Depends(deps.get_current_user),
):
    try:
        vectorstore = get_vectorstore(f"user_{current_user.id}_resumes")
        retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
        
        llm = get_llm(request.llm_provider)
        
        system_prompt = (
            "You are an expert AI Career Coach named CareerPilot AI. "
            "Use the provided context containing the user's resume/documents to answer the question. "
            "If you don't know the answer based on the context, politely say so. "
            "Give extremely detailed and helpful responses. "
            "Use markdown, tables, and citations when applicable.\n\n"
            "{context}"
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])
        
        question_answer_chain = create_stuff_documents_chain(llm, prompt)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)
        
        response = rag_chain.invoke({"input": request.query})
        
        return {"answer": response["answer"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
