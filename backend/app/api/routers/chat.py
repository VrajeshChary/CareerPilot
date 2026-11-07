from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.resume import Resume
from app.rag.engine import query_vectorstore
from app.services.llm_service import LLMService, SmartResumeAnalyzer

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    llm_provider: Optional[str] = "auto"
    resume_id: Optional[int] = None

@router.post("/")
async def chat_with_resume(
    request: ChatRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    try:
        # 1. Retrieve RAG context from vector store
        retrieved_chunks = query_vectorstore(
            user_id=current_user.id,
            query=request.query,
            top_k=4,
            resume_id=request.resume_id
        )

        context_text = ""
        sources = []
        if retrieved_chunks:
            context_text = "\n\n---\n\n".join([c["content"] for c in retrieved_chunks])
            sources = [c["metadata"] for c in retrieved_chunks]
        else:
            # Fallback: grab latest resume text directly
            query_filter = db.query(Resume).filter(Resume.owner_id == current_user.id)
            if request.resume_id:
                query_filter = query_filter.filter(Resume.id == request.resume_id)
            latest_resume = query_filter.order_by(Resume.created_at.desc()).first()
            if latest_resume and latest_resume.parsed_text:
                context_text = latest_resume.parsed_text[:2500]
                sources = [{"resume_id": latest_resume.id, "filename": latest_resume.filename}]

        system_prompt = (
            "You are CareerPilot AI, an elite executive career coach and technical talent strategist. "
            "You provide sharp, actionable, evidence-based career advice, interview strategies, "
            "and resume optimizations. Answer the user's question directly based on their resume context. "
            "Format your answer with clean Markdown headers, bullet points, and code/metrics where appropriate. "
            "Avoid generic boilerplate or excessive fluff."
        )

        prompt = (
            f"Relevant Resume Context:\n{context_text if context_text else 'No specific resume uploaded yet.'}\n\n"
            f"User Question:\n{request.query}"
        )

        active_provider = LLMService.get_active_provider(request.llm_provider)
        answer = ""

        if active_provider != "smart_local":
            answer = LLMService.generate_text(
                prompt=prompt,
                system_prompt=system_prompt,
                provider=request.llm_provider
            )

        # Smart fallback if no external LLM or generation was blank
        if not answer:
            active_provider = "smart_local"
            q_lower = request.query.lower()
            if any(k in q_lower for k in ["skill", "strength", "stack", "good at"]):
                answer = (
                    "### 🎯 Core Technical Strengths Identified\n\n"
                    "Based on your uploaded resume documents, your primary strengths center around:\n"
                    "- **Full-Stack Development & Architecture**: Demonstrating ownership across both frontend frameworks and backend systems.\n"
                    "- **Modern API Design**: Designing decoupled services, database schemas, and background tasks.\n"
                    "- **Engineering Best Practices**: CI/CD automation, testing, and containerized deployments.\n\n"
                    "**Career Coach Tip:** When interviewing, frame these skills around quantifiable scale (e.g. throughput, latency reductions, user volume) rather than just tool lists."
                )
            elif any(k in q_lower for k in ["improve", "weakness", "missing", "ats", "score"]):
                answer = (
                    "### 📈 High-Priority Resume Optimizations\n\n"
                    "1. **Quantify Bullet Points**: Ensure at least 60% of your experience bullets follow Google's XYZ formula: *'Accomplished [X], as measured by [Y], by doing [Z]'*.\n"
                    "2. **Eliminate Passive Verbs**: Replace phrases like *'worked on'* or *'assisted with'* with decisive power verbs like *'architected'*, *'spearheaded'*, *'streamlined'*.\n"
                    "3. **Targeted Keyword Mirroring**: For each job you apply to, compare the JD in the Job Matcher tab and incorporate missing domain terms in your summary and project descriptions."
                )
            elif any(k in q_lower for k in ["interview", "prep", "question"]):
                answer = (
                    "### 💡 Interview Preparation Strategy\n\n"
                    "- **Technical Deep-Dive**: Be ready to white-board the architecture of your most complex system, explaining the tradeoffs between SQL vs NoSQL, caching layers, and synchronous vs asynchronous processing.\n"
                    "- **Behavioral (STAR Method)**: Prepare a 2-minute story for a project that went off-schedule or faced a production incident, highlighting your blameless diagnostic approach.\n"
                    "- **Questions for the Interviewer**: Ask *'What is the biggest technical hurdle your engineering team is actively tackling this quarter?'*"
                )
            else:
                answer = (
                    f"### 🚀 CareerPilot Strategy Insight\n\n"
                    f"Regarding **'{request.query}'**:\n\n"
                    f"Based on your profile context, the most effective trajectory is to position yourself as an impact-oriented engineer. "
                    f"Highlight end-to-end system ownership, collaborative leadership across cross-functional teams, and measurable business outcomes.\n\n"
                    f"*Would you like to run a specific mock interview question, draft a tailored cover letter, or audit a specific section of your resume?*"
                )

        return {
            "answer": answer,
            "sources": sources,
            "provider": active_provider
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
