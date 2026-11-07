from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.models.resume import Resume
from app.models.application import JobApplication
from app.schemas.user import UserCreate, UserUpdate, PasswordChange, User as UserSchema
from app.schemas.token import Token

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    user = db.query(User).filter(User.email == form_data.username.lower().strip()).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=UserSchema)
def register_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
):
    email = user_in.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user = User(
        email=email,
        hashed_password=security.get_password_hash(user_in.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me", response_model=UserSchema)
def read_user_me(
    current_user: User = Depends(deps.get_current_user),
):
    return current_user

@router.put("/me", response_model=UserSchema)
def update_user_me(
    user_in: UserUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name.strip()
    if user_in.target_title is not None:
        current_user.target_title = user_in.target_title.strip()
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password")
def change_password(
    pwd_in: PasswordChange,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if not security.verify_password(pwd_in.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    
    if len(pwd_in.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    current_user.hashed_password = security.get_password_hash(pwd_in.new_password)
    db.commit()
    return {"message": "Password updated successfully."}

@router.get("/profile-summary")
def get_user_profile_summary(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    resumes = db.query(Resume).filter(Resume.owner_id == current_user.id).all()
    applications = db.query(JobApplication).filter(JobApplication.user_id == current_user.id).all()
    
    scores = [r.ats_score for r in resumes if r.ats_score is not None]
    avg_score = int(sum(scores) / len(scores)) if scores else 0

    return {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "target_title": current_user.target_title,
        "resumes_count": len(resumes),
        "applications_count": len(applications),
        "average_ats_score": avg_score,
        "primary_resume_id": next((r.id for r in resumes if r.is_primary), resumes[0].id if resumes else None)
    }
