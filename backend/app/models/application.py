from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True, nullable=False)
    job_title = Column(String, nullable=False)
    job_description = Column(Text, nullable=False)
    match_score = Column(Integer, nullable=True)
    match_analysis = Column(Text, nullable=True)  # JSON text
    status = Column(String, default="Saved")       # Saved, Applied, Interviewing, Offer, Rejected
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="applications")

    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    resume = relationship("Resume", back_populates="applications")
