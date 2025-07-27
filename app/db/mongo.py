from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None

async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client.get_default_database()
    print("✅ Connected to MongoDB Atlas")

def get_db() -> AsyncIOMotorDatabase:
    """Return the MongoDB database instance. Raise error if not connected."""
    if db is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return db
