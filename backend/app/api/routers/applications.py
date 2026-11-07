import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.application import JobApplication
from app.models.resume import Resume
from app.schemas.application import JobApplicationCreate, JobApplicationUpdate, JobApplicationResponse
from app.services.llm_service import SmartResumeAnalyzer, LLMService

router = APIRouter()

@router.post("/", response_model=JobApplicationResponse)
def create_job_application(
    app_in: JobApplicationCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    # If resume_id is provided, compute or attach match score
    match_score = None
    match_analysis_json = None

    if app_in.resume_id:
        resume = db.query(Resume).filter(Resume.id == app_in.resume_id, Resume.owner_id == current_user.id).first()
        if resume and resume.parsed_text:
            match_data = SmartResumeAnalyzer.match_job_description(resume.parsed_text, app_in.job_description)
            match_score = match_data.get("match_score", 70)
            match_analysis_json = json.dumps(match_data)

    job_app = JobApplication(
        company_name=app_in.company_name.strip(),
        job_title=app_in.job_title.strip(),
        job_description=app_in.job_description.strip(),
        match_score=match_score,
        match_analysis=match_analysis_json,
        status=app_in.status or "Saved",
        notes=app_in.notes,
        user_id=current_user.id,
        resume_id=app_in.resume_id
    )
    db.add(job_app)
    db.commit()
    db.refresh(job_app)

    parsed_analysis = json.loads(job_app.match_analysis) if job_app.match_analysis else None
    return JobApplicationResponse(
        id=job_app.id,
        company_name=job_app.company_name,
        job_title=job_app.job_title,
        job_description=job_app.job_description,
        match_score=job_app.match_score,
        match_analysis=parsed_analysis,
        status=job_app.status,
        notes=job_app.notes,
        resume_id=job_app.resume_id,
        created_at=job_app.created_at,
        updated_at=job_app.updated_at
    )

@router.get("/", response_model=List[JobApplicationResponse])
def get_job_applications(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    apps = db.query(JobApplication).filter(JobApplication.user_id == current_user.id).order_by(JobApplication.created_at.desc()).all()
    results = []
    for a in apps:
        parsed_analysis = None
        if a.match_analysis:
            try:
                parsed_analysis = json.loads(a.match_analysis)
            except Exception:
                pass
        results.append(JobApplicationResponse(
            id=a.id,
            company_name=a.company_name,
            job_title=a.job_title,
            job_description=a.job_description,
            match_score=a.match_score,
            match_analysis=parsed_analysis,
            status=a.status or "Saved",
            notes=a.notes,
            resume_id=a.resume_id,
            created_at=a.created_at,
            updated_at=a.updated_at
        ))
    return results

@router.patch("/{app_id}", response_model=JobApplicationResponse)
def update_job_application(
    app_id: int,
    app_in: JobApplicationUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    job_app = db.query(JobApplication).filter(JobApplication.id == app_id, JobApplication.user_id == current_user.id).first()
    if not job_app:
        raise HTTPException(status_code=404, detail="Job application not found")

    if app_in.status is not None:
        job_app.status = app_in.status
    if app_in.notes is not None:
        job_app.notes = app_in.notes
    if app_in.company_name is not None:
        job_app.company_name = app_in.company_name
    if app_in.job_title is not None:
        job_app.job_title = app_in.job_title

    db.commit()
    db.refresh(job_app)

    parsed_analysis = json.loads(job_app.match_analysis) if job_app.match_analysis else None
    return JobApplicationResponse(
        id=job_app.id,
        company_name=job_app.company_name,
        job_title=job_app.job_title,
        job_description=job_app.job_description,
        match_score=job_app.match_score,
        match_analysis=parsed_analysis,
        status=job_app.status,
        notes=job_app.notes,
        resume_id=job_app.resume_id,
        created_at=job_app.created_at,
        updated_at=job_app.updated_at
    )

@router.delete("/{app_id}")
def delete_job_application(
    app_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    job_app = db.query(JobApplication).filter(JobApplication.id == app_id, JobApplication.user_id == current_user.id).first()
    if not job_app:
        raise HTTPException(status_code=404, detail="Job application not found")

    db.delete(job_app)
    db.commit()
    return {"message": "Job application deleted."}
