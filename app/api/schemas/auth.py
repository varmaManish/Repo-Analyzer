# app/api/schemas/auth.py - Complete authentication schemas
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: str = Field(..., min_length=2, max_length=100)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    id_token: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime
    auth_provider: str = "manual"  # "manual" or "google"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

class UserInDB(BaseModel):
    id: Optional[str] = None
    email: str
    full_name: str
    hashed_password: Optional[str] = None
    google_id: Optional[str] = None
    auth_provider: str = "manual"
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None