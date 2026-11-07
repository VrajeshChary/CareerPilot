import json
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.resume import Resume
from app.services.llm_service import LLMService, SmartResumeAnalyzer

router = APIRouter()

class JobMatchRequest(BaseModel):
    resume_id: int
    job_description: str

class GenerationRequest(BaseModel):
    resume_id: int
    context: str
    tone: Optional[str] = "Confident"
    provider: Optional[str] = "auto"

class BulletRewriteRequest(BaseModel):
    bullet: str
    provider: Optional[str] = "auto"

@router.get("/{resume_id}/parse")
async def get_parsed_resume(
    resume_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.owner_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if resume.parsed_json:
        try:
            return {"parsed_data": json.loads(resume.parsed_json)}
        except Exception:
            pass

    parsed = SmartResumeAnalyzer.parse_sections(resume.parsed_text or "")
    resume.parsed_json = json.dumps(parsed)
    db.commit()
    return {"parsed_data": parsed}

@router.get("/{resume_id}/score")
async def get_resume_score(
    resume_id: int,
    refresh: bool = False,
    provider: Optional[str] = "auto",
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.owner_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if resume.analysis_data and not refresh:
        try:
            cached = json.loads(resume.analysis_data)
            return {"score_data": cached, "source": "cached"}
        except Exception:
            pass

    text_sample = (resume.parsed_text or "")[:4000]

    score_result = None
    active = LLMService.get_active_provider(provider)

    if active != "smart_local":
        system_prompt = (
            "You are a principal technical recruiter and expert ATS auditor. "
            "Analyze the resume and return a STRICT JSON object with these keys: "
            "Overall_score (integer 0-100), ATS_score (0-100), Readability (0-100), "
            "Technical_Skills (0-100), Leadership (0-100), Impact (0-100), "
            "Formatting (0-100), Grammar (0-100), summary_critique (string), "
            "strengths (list of strings), red_flags (list of strings), "
            "bullet_rewrites (list of objects with original, improved, reason)."
        )
        prompt = f"Resume text to audit:\n\n{text_sample}"
        raw_llm = LLMService.generate_text(prompt, system_prompt=system_prompt, provider=provider)
        score_result = LLMService.clean_json_response(raw_llm)

    if not score_result or "Overall_score" not in score_result:
        score_result = SmartResumeAnalyzer.evaluate_resume(resume.parsed_text or "")

    resume.ats_score = score_result.get("Overall_score", 75)
    resume.analysis_data = json.dumps(score_result)
    db.commit()

    return {"score_data": score_result, "source": active}

@router.post("/rewrite-bullet")
async def rewrite_single_bullet(
    request: BulletRewriteRequest,
    current_user: User = Depends(deps.get_current_user),
):
    if not request.bullet.strip():
        raise HTTPException(status_code=400, detail="Bullet point cannot be empty.")

    active = LLMService.get_active_provider(request.provider)
    if active != "smart_local":
        system_prompt = (
            "You are a resume writer for FAANG and Fortune 500 executives. "
            "Given a single resume bullet point, return a STRICT JSON object with a key 'rewrites' "
            "containing 3 objects with keys 'style', 'rewrite', and 'rationale'."
        )
        prompt = f"Original bullet point to transform:\n{request.bullet}"
        raw = LLMService.generate_text(prompt, system_prompt=system_prompt, provider=request.provider)
        res_json = LLMService.clean_json_response(raw)
        if res_json and "rewrites" in res_json:
            return {"rewrites": res_json["rewrites"], "source": active}

    # Fallback
    rewrites = SmartResumeAnalyzer.rewrite_single_bullet(request.bullet)
    return {"rewrites": rewrites, "source": "smart_local"}

@router.post("/match")
async def match_job(
    request: JobMatchRequest,
    provider: Optional[str] = "auto",
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == request.resume_id, Resume.owner_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    active = LLMService.get_active_provider(provider)
    if active != "smart_local":
        system_prompt = (
            "You are an ATS matching algorithm. Compare the job description with the resume. "
            "Return a STRICT JSON object containing: "
            "match_score (integer 0-100), fit_level (string, e.g. Strong Match, Moderate Match, Gap Identified), "
            "matching_skills (list of strings), missing_skills (list of strings), "
            "recommendations (list of 3-5 specific actionable tailoring steps)."
        )
        prompt = f"Target Job Description:\n{request.job_description}\n\nCandidate Resume:\n{resume.parsed_text[:3500]}"
        raw_llm = LLMService.generate_text(prompt, system_prompt=system_prompt, provider=provider)
        res_json = LLMService.clean_json_response(raw_llm)
        if res_json and "match_score" in res_json:
            return {"match_data": res_json, "source": active}

    match_data = SmartResumeAnalyzer.match_job_description(resume.parsed_text or "", request.job_description)
    return {"match_data": match_data, "source": "smart_local"}

@router.post("/cover-letter")
async def generate_cover_letter(
    request: GenerationRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == request.resume_id, Resume.owner_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    active = LLMService.get_active_provider(request.provider)
    if active != "smart_local":
        system_prompt = (
            f"You are an elite executive career advisor. Write a compelling, highly personalized cover letter "
            f"in a {request.tone or 'Confident'} tone. Do not use generic filler or cliches. "
            f"Directly tie the candidate's achievements and skills from the resume to the target role/company."
        )
        prompt = f"Target Opportunity:\n{request.context}\n\nCandidate Resume:\n{resume.parsed_text[:3500]}"
        text = LLMService.generate_text(prompt, system_prompt=system_prompt, provider=request.provider)
        if text and len(text) > 100:
            return {"cover_letter": text, "source": active}

    letter = SmartResumeAnalyzer.generate_cover_letter(resume.parsed_text or "", request.context, tone=request.tone or "Confident")
    return {"cover_letter": letter, "source": "smart_local"}

@router.post("/interview-prep")
async def generate_interview_prep(
    request: GenerationRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == request.resume_id, Resume.owner_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    active = LLMService.get_active_provider(request.provider)
    if active != "smart_local":
        system_prompt = (
            "You are a Staff Engineer and Hiring Manager. Based on the candidate's resume and target context, "
            "generate tailored interview preparation. Return a STRICT JSON object containing: "
            "technical_questions (list of objects with question, key_focus, sample_talking_point), "
            "behavioral_questions (list of objects with question, framework, sample_talking_point), "
            "system_design_questions (list of objects with question, key_focus)."
        )
        prompt = f"Target Role / Context:\n{request.context}\n\nCandidate Resume:\n{resume.parsed_text[:3500]}"
        raw_llm = LLMService.generate_text(prompt, system_prompt=system_prompt, provider=request.provider)
        res_json = LLMService.clean_json_response(raw_llm)
        if res_json and "technical_questions" in res_json:
            return {"interview_prep": res_json, "source": active}

    prep_data = SmartResumeAnalyzer.generate_interview_prep(resume.parsed_text or "", request.context)
    return {"interview_prep": prep_data, "source": "smart_local"}
