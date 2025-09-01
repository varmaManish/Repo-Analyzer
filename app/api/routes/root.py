import os
from fastapi import APIRouter
from fastapi.responses import FileResponse
from app.core.config import settings

router = APIRouter()

@router.get("/")
async def serve_index():
    # Matches your original behavior serving static/index.html
    return FileResponse(os.path.join(settings.STATIC_DIR, "index.html"))
