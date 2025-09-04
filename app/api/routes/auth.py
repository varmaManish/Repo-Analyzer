# app/api/routes/auth.py - Complete authentication routes
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any

from app.api.schemas.auth import UserRegister, UserLogin, GoogleAuthRequest, Token, UserResponse
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

@router.post("/register", response_model=Token)
async def register(user_data: UserRegister) -> Dict[str, Any]:
    """Register a new user with manual authentication"""
    try:
        result = await auth_service.register_user(user_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin) -> Dict[str, Any]:
    """Login user with email and password"""
    result = await auth_service.authenticate_user(
        user_credentials.email, 
        user_credentials.password
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return result

@router.post("/google", response_model=Token)
async def google_auth(google_request: GoogleAuthRequest) -> Dict[str, Any]:
    """Authenticate user with Google OAuth"""
    try:
        result = await auth_service.google_auth(google_request.id_token)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google authentication failed: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserResponse:
    """Get current authenticated user"""
    token = credentials.credentials
    return await auth_service.get_current_user(token)

@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Successfully logged out"}

# Dependency to get current user
async def get_current_user_dependency(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserResponse:
    """Dependency to get current user for protected routes"""
    token = credentials.credentials
    return await auth_service.get_current_user(token)