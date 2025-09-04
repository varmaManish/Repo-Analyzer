# app/api/routes/root.py - Fixed to redirect to login first
import os
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, RedirectResponse
from app.core.config import settings

router = APIRouter()

@router.get("/")
async def serve_root(request: Request):
    """Redirect to login page first, then serve main app if authenticated"""
    # Check if user has auth token in headers
    authorization = request.headers.get("Authorization")
    
    # If no authorization and accessing from browser, redirect to login
    user_agent = request.headers.get("user-agent", "").lower()
    if not authorization and "mozilla" in user_agent:  # Browser request
        return RedirectResponse(url="/login", status_code=302)
    
    # Otherwise serve the main index page
    return FileResponse(os.path.join(settings.STATIC_DIR, "index.html"))

@router.get("/app")
async def serve_main_app():
    """Serve the main application (after login)"""
    return FileResponse(os.path.join(settings.STATIC_DIR, "index.html"))

@router.get("/login")
async def serve_login():
    """Serve the login page"""
    return FileResponse(os.path.join(settings.STATIC_DIR, "login.html"))

@router.get("/register") 
async def serve_register():
    """Serve the register page"""
    return FileResponse(os.path.join(settings.STATIC_DIR, "register.html"))

@router.get("/login.html")
async def serve_login_html():
    """Serve the login page with .html extension"""
    return FileResponse(os.path.join(settings.STATIC_DIR, "login.html"))

@router.get("/register.html")
async def serve_register_html():
    """Serve the register page with .html extension"""
    return FileResponse(os.path.join(settings.STATIC_DIR, "register.html"))