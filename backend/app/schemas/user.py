from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    target_title: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class UserInDBBase(UserBase):
    id: Optional[int] = None
    full_name: Optional[str] = None
    target_title: Optional[str] = None
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass
