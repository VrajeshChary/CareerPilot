from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class ResumeBase(BaseModel):
    filename: str
    title: Optional[str] = None
    target_role: Optional[str] = None

class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    target_role: Optional[str] = None
    parsed_text: Optional[str] = None
    is_primary: Optional[bool] = None

class ResumeResponse(BaseModel):
    id: int
    filename: str
    title: Optional[str] = None
    file_size: Optional[int] = None
    content_type: Optional[str] = None
    ats_score: Optional[int] = None
    is_primary: bool = False
    version: int = 1
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    has_analysis: bool = False
    preview_snippet: Optional[str] = None

    class Config:
        from_attributes = True

class ResumeDetailResponse(ResumeResponse):
    parsed_text: Optional[str] = None
    analysis_data: Optional[Dict[str, Any]] = None
    parsed_json: Optional[Dict[str, Any]] = None
