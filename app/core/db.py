# app/core/db.py - Enhanced database connection with better error handling

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)

class Database:
    client: Optional[AsyncIOMotorClient] = None
    database = None
    _connection_tested = False

db = Database()

async def connect_to_mongo():
    """Create database connection with enhanced error handling"""
    try:
        if not settings.MONGO_URI:
            logger.error("MONGO_URI not set in environment variables")
            logger.info("Please set MONGO_URI in your .env file")
            logger.info("Example: MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name")
            return

        logger.info("Attempting to connect to MongoDB...")
        logger.info(f"MongoDB URI: {settings.MONGO_URI.split('@')[1] if '@' in settings.MONGO_URI else 'Invalid URI format'}")
        
        # Create MongoDB client with connection timeout
        db.client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=5000,
            maxPoolSize=10,
            retryWrites=True
        )
        
        # Set database
        db.database = db.client[settings.MONGO_DB]
        
        # Test the connection with timeout
        await asyncio.wait_for(
            db.client.admin.command('ping'),
            timeout=10.0
        )
        
        db._connection_tested = True
        logger.info("✅ Connected to MongoDB successfully")
        logger.info(f"Database name: {settings.MONGO_DB}")
        
        # Create indexes
        await create_indexes()
        
    except asyncio.TimeoutError:
        logger.error("❌ MongoDB connection timeout - check your internet connection and MongoDB URI")
        logger.info("Troubleshooting tips:")
        logger.info("1. Verify your MongoDB Atlas cluster is running")
        logger.info("2. Check if your IP address is whitelisted in MongoDB Atlas")
        logger.info("3. Verify the connection string includes the correct database name")
    except Exception as e:
        logger.error(f"❌ Error connecting to MongoDB: {e}")
        logger.info("Troubleshooting tips:")
        logger.info("1. Check your MONGO_URI format in .env file")
        logger.info("2. Ensure MongoDB Atlas credentials are correct")
        logger.info("3. Verify network connectivity to MongoDB Atlas")
        logger.info("4. Check if your IP is whitelisted in MongoDB Atlas Network Access")

async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("Disconnected from MongoDB")

async def create_indexes():
    """Create database indexes for better performance"""
    if not db.database:
        logger.warning("Database is None, skipping index creation")
        return
        
    try:
        # Create unique index on email
        await db.database.users.create_index("email", unique=True)
        logger.info("✅ Created unique index on email")
        
        # Create index on google_id for OAuth users (sparse index)
        await db.database.users.create_index("google_id", unique=True, sparse=True)
        logger.info("✅ Created unique index on google_id")
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.warning(f"Error creating indexes: {e}")

def get_database():
    """Get database instance"""
    if not db._connection_tested:
        logger.warning("Database connection not tested yet")
        return None
    return db.database

async def test_connection():
    """Test database connection explicitly"""
    try:
        if db.database:
            await db.client.admin.command('ping')
            logger.info("Database connection test: SUCCESS")
            return True
        else:
            logger.error("Database connection test: FAILED - No database instance")
            return False
    except Exception as e:
        logger.error(f"Database connection test: FAILED - {e}")
        return False

async def get_connection_info():
    """Get connection information for debugging"""
    info = {
        "mongo_uri_set": bool(settings.MONGO_URI),
        "mongo_db_name": settings.MONGO_DB,
        "client_connected": db.client is not None,
        "database_set": db.database is not None,
        "connection_tested": db._connection_tested
    }
    
    if db.client:
        try:
            # Try to get server info
            server_info = await db.client.server_info()
            info["server_version"] = server_info.get("version", "Unknown")
            info["connection_status"] = "Connected"
        except Exception as e:
            info["connection_status"] = f"Error: {str(e)}"
    else:
        info["connection_status"] = "Not connected"
    
    return info