from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class JobApplicationCreate(BaseModel):
    company_name: str
    job_title: str
    job_description: str
    resume_id: Optional[int] = None
    status: Optional[str] = "Saved"
    notes: Optional[str] = None

class JobApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class JobApplicationResponse(BaseModel):
    id: int
    company_name: str
    job_title: str
    job_description: str
    match_score: Optional[int] = None
    match_analysis: Optional[Dict[str, Any]] = None
    status: str
    notes: Optional[str] = None
    resume_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
