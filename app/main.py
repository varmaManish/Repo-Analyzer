from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.routes.github import router as github_router
from app.api.routes.root import router as root_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional static hosting (kept identical)
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# Routes
app.include_router(root_router)
app.include_router(github_router)
