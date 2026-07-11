from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from app.api import deps
from app.models.user import User
from app.rag.engine import get_vectorstore
from app.core.config import settings

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    llm_provider: str = "openai"  # openai, anthropic, gemini, groq

def get_llm(provider: str):
    if provider == "openai":
        return ChatOpenAI(api_key=settings.OPENAI_API_KEY, model="gpt-4o-mini")
    elif provider == "anthropic":
        return ChatAnthropic(api_key=settings.ANTHROPIC_API_KEY, model="claude-3-haiku-20240307")
    elif provider == "gemini":
        return ChatGoogleGenerativeAI(google_api_key=settings.GEMINI_API_KEY, model="gemini-1.5-pro")
    elif provider == "groq":
        return ChatGroq(api_key=settings.GROQ_API_KEY, model_name="llama3-8b-8192")
    else:
        # Default to OpenAI
        return ChatOpenAI(api_key=settings.OPENAI_API_KEY, model="gpt-3.5-turbo")

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
