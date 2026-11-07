import os
import json
import shutil
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.api import deps
from app.core.config import settings
from app.models.user import User
from app.models.resume import Resume
from app.schemas.resume import ResumeUpdate, ResumeResponse, ResumeDetailResponse
from app.services.document_service import DocumentService
from app.rag.engine import add_document_to_vectorstore, delete_resume_vectors
from app.services.llm_service import SmartResumeAnalyzer, LLMService

router = APIRouter()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    title: Optional[str] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    try:
        filename = file.filename or "resume.pdf"
        safe_filename = os.path.basename(filename)
        file_location = os.path.join(settings.UPLOAD_DIR, f"{current_user.id}_{safe_filename}")

        # Extract text first
        parsed_text = await DocumentService.parse_upload(file)
        
        # Save file to disk
        await file.seek(0)
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        
        file_size = os.path.getsize(file_location)

        # Baseline evaluation immediately
        baseline_eval = SmartResumeAnalyzer.evaluate_resume(parsed_text)
        parsed_sections = SmartResumeAnalyzer.parse_sections(parsed_text)
        ats_score = baseline_eval.get("Overall_score", 75)

        # Check if user has existing resumes (if first resume, set primary)
        existing_count = db.query(Resume).filter(Resume.owner_id == current_user.id).count()
        is_first = existing_count == 0

        # Save to DB
        resume = Resume(
            filename=safe_filename,
            title=title or safe_filename.rsplit(".", 1)[0],
            file_path=file_location,
            file_size=file_size,
            content_type=file.content_type,
            parsed_text=parsed_text,
            ats_score=ats_score,
            analysis_data=json.dumps(baseline_eval),
            parsed_json=json.dumps(parsed_sections),
            is_primary=is_first,
            owner_id=current_user.id
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)

        # Index in Vectorstore for RAG
        add_document_to_vectorstore(parsed_text, current_user.id, resume.id)

        return {
            "id": resume.id,
            "filename": resume.filename,
            "title": resume.title,
            "file_size": file_size,
            "ats_score": ats_score,
            "is_primary": resume.is_primary,
            "created_at": resume.created_at,
            "message": "Resume successfully uploaded, parsed, and indexed."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")

@router.get("/")
def get_resumes(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resumes = db.query(Resume).filter(Resume.owner_id == current_user.id).order_by(Resume.is_primary.desc(), Resume.created_at.desc()).all()
    results = []
    for r in resumes:
        preview = (r.parsed_text[:200] + "...") if r.parsed_text else ""
        results.append({
            "id": r.id,
            "filename": r.filename,
            "title": r.title or r.filename,
            "file_size": r.file_size,
            "ats_score": r.ats_score,
            "is_primary": bool(r.is_primary),
            "version": r.version or 1,
            "has_analysis": bool(r.analysis_data),
            "preview_snippet": preview,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })
    return results

@router.get("/stats/overview")
def get_resume_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resumes = db.query(Resume).filter(Resume.owner_id == current_user.id).all()
    total_count = len(resumes)
    if total_count == 0:
        return {
            "total_resumes": 0,
            "avg_ats_score": 0,
            "top_ats_score": 0,
            "indexed_count": 0,
            "active_model": LLMService.get_active_provider()
        }

    scores = [r.ats_score for r in resumes if r.ats_score is not None]
    avg_score = int(sum(scores) / len(scores)) if scores else 0
    max_score = max(scores) if scores else 0

    return {
        "total_resumes": total_count,
        "avg_ats_score": avg_score,
        "top_ats_score": max_score,
        "indexed_count": total_count,
        "active_model": LLMService.get_active_provider()
    }

@router.get("/{resume_id}")
def get_resume_detail(
    resume_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.owner_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    analysis = None
    if resume.analysis_data:
        try:
            analysis = json.loads(resume.analysis_data)
        except Exception:
            analysis = None

    parsed_sections = None
    if resume.parsed_json:
        try:
            parsed_sections = json.loads(resume.parsed_json)
        except Exception:
            parsed_sections = None

    return {
        "id": resume.id,
        "filename": resume.filename,
        "title": resume.title or resume.filename,
        "file_size": resume.file_size,
        "content_type": resume.content_type,
        "ats_score": resume.ats_score,
        "is_primary": bool(resume.is_primary),
        "version": resume.version or 1,
        "created_at": resume.created_at,
        "updated_at": resume.updated_at,
        "parsed_text": resume.parsed_text,
        "analysis_data": analysis,
        "parsed_json": parsed_sections,
    }

@router.put("/{resume_id}")
def update_resume(
    resume_id: int,
    resume_in: ResumeUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.owner_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if resume_in.title is not None:
        resume.title = resume_in.title.strip()
    if resume_in.target_role is not None:
        resume.target_role = resume_in.target_role.strip()
        
    # If text was edited in the UI, re-evaluate and re-index vector store!
    if resume_in.parsed_text is not None and resume_in.parsed_text != resume.parsed_text:
        resume.parsed_text = resume_in.parsed_text.strip()
        new_eval = SmartResumeAnalyzer.evaluate_resume(resume.parsed_text)
        new_sections = SmartResumeAnalyzer.parse_sections(resume.parsed_text)
        resume.ats_score = new_eval.get("Overall_score", 75)
        resume.analysis_data = json.dumps(new_eval)
        resume.parsed_json = json.dumps(new_sections)
        resume.version = (resume.version or 1) + 1
        
        # Update vector chunks
        delete_resume_vectors(current_user.id, resume.id)
        add_document_to_vectorstore(resume.parsed_text, current_user.id, resume.id)

    if resume_in.is_primary is True:
        # Unset other primary resumes
        db.query(Resume).filter(Resume.owner_id == current_user.id).update({"is_primary": False})
        resume.is_primary = True

    db.commit()
    db.refresh(resume)
    return {"message": "Resume updated and re-indexed successfully.", "ats_score": resume.ats_score, "version": resume.version}

@router.post("/{resume_id}/primary")
def set_primary_resume(
    resume_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.owner_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    db.query(Resume).filter(Resume.owner_id == current_user.id).update({"is_primary": False})
    resume.is_primary = True
    db.commit()
    return {"message": f"'{resume.filename}' set as primary resume."}

@router.get("/{resume_id}/export")
def export_audit_report(
    resume_id: int,
    format: str = "markdown",
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.owner_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    eval_data = {}
    if resume.analysis_data:
        try:
            eval_data = json.loads(resume.analysis_data)
        except Exception:
            pass
    if not eval_data:
        eval_data = SmartResumeAnalyzer.evaluate_resume(resume.parsed_text or "")

    md_report = SmartResumeAnalyzer.export_audit_report_markdown(resume.filename, eval_data)
    
    return Response(
        content=md_report,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=ATS_Audit_{resume.id}.md"}
    )

@router.delete("/{resume_id}")
def delete_resume(
    resume_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.owner_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    if resume.file_path and os.path.exists(resume.file_path):
        try:
            os.remove(resume.file_path)
        except Exception as e:
            print(f"Failed to remove file from disk: {e}")

    delete_resume_vectors(current_user.id, resume.id)
    db.delete(resume)
    db.commit()

    return {"message": "Resume and indexed embeddings successfully deleted."}
