from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, github, user
from app.db.mongo import connect_db

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(user.router, prefix="/user", tags=["user"])
app.include_router(github.router, prefix="/github", tags=["github"])

@app.on_event("startup")
async def startup_db():
    await connect_db()
