# app/main.py - Complete main application with authentication
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.db import connect_to_mongo, close_mongo_connection
from app.api.routes.github import router as github_router
from app.api.routes.root import router as root_router
from app.api.routes.auth import router as auth_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB
    logger.info("Starting up...")
    await connect_to_mongo()
    yield
    # Shutdown: Close MongoDB connection
    logger.info("Shutting down...")
    await close_mongo_connection()

app = FastAPI(
    title="GitHub Repository Analyzer",
    description="Analyze GitHub repositories with authentication",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file hosting
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# Include routers
app.include_router(root_router)
app.include_router(github_router)
app.include_router(auth_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "GitHub Repository Analyzer is running"}