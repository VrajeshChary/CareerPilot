import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.resume import Resume
from app.services.document_service import DocumentService
from app.rag.engine import add_document_to_vectorstore

router = APIRouter()

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    try:
        # Save file to disk
        file_location = f"{UPLOAD_DIR}/{current_user.id}_{file.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        
        # Reset file pointer after saving to read again
        await file.seek(0)
        
        # Extract text
        parsed_text = await DocumentService.parse_upload(file)
        
        # Save to DB
        resume = Resume(
            filename=file.filename,
            file_path=file_location,
            parsed_text=parsed_text,
            owner_id=current_user.id
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
        # Add to Vectorstore
        add_document_to_vectorstore(parsed_text, current_user.id, resume.id)
        
        return {"id": resume.id, "filename": resume.filename, "message": "Resume uploaded and indexed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
def get_resumes(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resumes = db.query(Resume).filter(Resume.owner_id == current_user.id).all()
    return [{"id": r.id, "filename": r.filename, "created_at": r.created_at} for r in resumes]
