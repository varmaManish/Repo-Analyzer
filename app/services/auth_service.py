# app/services/auth_service.py - MongoDB-based authentication service

from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
import logging
from bson import ObjectId

from app.core.config import settings
from app.core.db import get_database
from app.utils.security import hash_password, verify_password, create_access_token
from app.api.schemas.auth import UserInDB, UserRegister, UserResponse

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self):
        self.db = None
        
    async def get_db(self):
        """Get database connection"""
        if self.db is None:
            self.db = get_database()
        return self.db
        
    async def register_user(self, user_data: UserRegister) -> Dict[str, Any]:
        """Register a new user with manual authentication"""
        db = await self.get_db()
        
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection not available"
            )
        
        try:
            # Check if user already exists
            existing_user = await db.users.find_one({"email": user_data.email})
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )

            # Create user document
            user_doc = {
                "email": user_data.email,
                "full_name": user_data.full_name,
                "hashed_password": hash_password(user_data.password),
                "auth_provider": "manual",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }

            # Insert user into MongoDB
            result = await db.users.insert_one(user_doc)
            user_id = str(result.inserted_id)
            
            logger.info(f"User registered successfully with ID: {user_id}")

            # Create access token
            access_token = create_access_token(data={"sub": user_data.email})

            # Return response
            user_response = UserResponse(
                id=user_id,
                email=user_doc["email"],
                full_name=user_doc["full_name"],
                is_active=user_doc["is_active"],
                created_at=user_doc["created_at"],
                auth_provider=user_doc["auth_provider"]
            )

            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user_response
            }
            
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Error during user registration: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Registration failed"
            )

    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with email and password"""
        db = await self.get_db()
        
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection not available"
            )
        
        try:
            # Find user by email
            user = await db.users.find_one({"email": email})
            
            if not user:
                return None

            # Check if this is a Google-only account
            if user.get("auth_provider") == "google" and not user.get("hashed_password"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Please use Google Sign-In for this account"
                )

            # Verify password
            if not user.get("hashed_password") or not verify_password(password, user["hashed_password"]):
                return None

            # Create access token
            access_token = create_access_token(data={"sub": email})

            # Return response
            user_response = UserResponse(
                id=str(user["_id"]),
                email=user["email"],
                full_name=user["full_name"],
                is_active=user["is_active"],
                created_at=user["created_at"],
                auth_provider=user.get("auth_provider", "manual")
            )

            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user_response
            }
            
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Error during user authentication: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication failed"
            )

    async def google_auth(self, id_token_str: str) -> Dict[str, Any]:
        """Authenticate user with Google OAuth"""
        db = await self.get_db()
        
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Database connection not available"
            )
        
        try:
            # Import Google libraries
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token

            logger.info(f"Attempting Google authentication with client ID: {settings.GOOGLE_CLIENT_ID}")

            # Check if Google OAuth is configured
            if not settings.GOOGLE_CLIENT_ID:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google OAuth not configured - GOOGLE_CLIENT_ID missing"
                )

            # Verify the Google ID token
            try:
                # Create a request object for Google verification
                request = google_requests.Request()
                
                # Verify the token with Google
                idinfo = id_token.verify_oauth2_token(
                    id_token_str,
                    request,
                    settings.GOOGLE_CLIENT_ID
                )

                logger.info(f"Google token verified successfully. Token info: {idinfo}")
                
            except ValueError as ve:
                logger.error(f"Google token verification failed: {str(ve)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid Google token: {str(ve)}"
                )
            except Exception as e:
                logger.error(f"Google token verification error: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Google authentication failed: {str(e)}"
                )

            # Extract user information from the verified token
            google_id = idinfo.get('sub')
            email = idinfo.get('email')
            name = idinfo.get('name', '')
            picture = idinfo.get('picture', '')

            logger.info(f"Extracted user info - ID: {google_id}, Email: {email}, Name: {name}")

            if not google_id or not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Google token - missing user information"
                )

            # Check if user exists by Google ID or email
            user = await db.users.find_one({
                "$or": [
                    {"google_id": google_id},
                    {"email": email}
                ]
            })

            if user:
                # Update existing user with Google info
                update_data = {
                    "updated_at": datetime.utcnow()
                }
                
                if not user.get("google_id"):
                    update_data["google_id"] = google_id
                    update_data["auth_provider"] = "google"
                    
                if picture:
                    update_data["profile_picture"] = picture
                
                # Update user in database
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": update_data}
                )
                
                # Refresh user data
                user = await db.users.find_one({"_id": user["_id"]})
                logger.info(f"Updated existing user {email} with Google authentication")
            else:
                # Create new user
                user_doc = {
                    "email": email,
                    "full_name": name or email.split('@')[0],
                    "google_id": google_id,
                    "auth_provider": "google",
                    "is_active": True,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "profile_picture": picture if picture else None
                }

                # Insert new user
                result = await db.users.insert_one(user_doc)
                user = await db.users.find_one({"_id": result.inserted_id})
                logger.info(f"Created new user {email} with Google authentication")

            # Create access token
            access_token = create_access_token(data={"sub": email})

            # Return response
            user_response = UserResponse(
                id=str(user["_id"]),
                email=user["email"],
                full_name=user["full_name"],
                is_active=user["is_active"],
                created_at=user["created_at"],
                auth_provider=user.get("auth_provider", "google")
            )

            logger.info(f"Google authentication successful for user {email}")
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user_response
            }

        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except ImportError as ie:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google authentication libraries not installed. Run: pip install google-auth"
            )
        except Exception as e:
            logger.error(f"Unexpected error in Google authentication: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Google authentication error: {str(e)}"
            )

    async def get_user_by_email(self, email: str) -> Optional[UserInDB]:
        """Get user by email from MongoDB"""
        db = await self.get_db()
        
        if db is None:
            return None
            
        try:
            user = await db.users.find_one({"email": email})
            if user:
                return UserInDB(
                    id=str(user["_id"]),
                    email=user["email"],
                    full_name=user["full_name"],
                    hashed_password=user.get("hashed_password"),
                    google_id=user.get("google_id"),
                    auth_provider=user.get("auth_provider", "manual"),
                    is_active=user["is_active"],
                    created_at=user["created_at"],
                    updated_at=user.get("updated_at")
                )
        except Exception as e:
            logger.error(f"Error fetching user by email: {e}")
            
        return None

    async def get_current_user(self, token: str) -> UserResponse:
        """Get current user from token"""
        from app.utils.security import decode_access_token
        
        try:
            payload = decode_access_token(token)
            email = payload.get("sub")
            if email is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token"
                )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

        user = await self.get_user_by_email(email)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            created_at=user.created_at,
            auth_provider=user.auth_provider
        )

# Create service instance
auth_service = AuthService()