from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    title = Column(String, nullable=True)  # User-given label / nickname
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True, default=0)
    content_type = Column(String, nullable=True)
    parsed_text = Column(Text, nullable=True)
    ats_score = Column(Integer, nullable=True)
    analysis_data = Column(Text, nullable=True)   # JSON string of comprehensive score & suggestions
    parsed_json = Column(Text, nullable=True)     # JSON string of structured sections
    target_role = Column(String, nullable=True)
    is_primary = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="resumes")
    applications = relationship("JobApplication", back_populates="resume")
