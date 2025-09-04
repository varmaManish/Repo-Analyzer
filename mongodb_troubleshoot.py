# mongodb_troubleshoot.py - MongoDB connection troubleshooting script

import os
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

async def test_mongodb_connection():
    """Comprehensive MongoDB connection testing"""
    
    print("🔍 MongoDB Connection Troubleshooting")
    print("=" * 50)
    
    # Step 1: Check environment variables
    mongo_uri = os.getenv("MONGO_URI")
    mongo_db = os.getenv("MONGO_DB", "github_analyzer")
    
    print(f"📋 Configuration Check:")
    print(f"   MONGO_URI set: {'✅ Yes' if mongo_uri else '❌ No'}")
    print(f"   MONGO_DB: {mongo_db}")
    
    if not mongo_uri:
        print("\n❌ MONGO_URI is not set!")
        print("🔧 Solution:")
        print("   1. Create a .env file in your project root")
        print("   2. Add: MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name")
        print("   3. Replace with your actual MongoDB Atlas connection string")
        return False
    
    # Step 2: Validate URI format
    print(f"\n🔗 URI Format Check:")
    if mongo_uri.startswith(("mongodb://", "mongodb+srv://")):
        print("   ✅ URI format is correct")
    else:
        print("   ❌ URI format is incorrect")
        print("   🔧 URI should start with 'mongodb://' or 'mongodb+srv://'")
        return False
    
    # Step 3: Check URI components
    if "@" in mongo_uri and "." in mongo_uri:
        print("   ✅ URI contains credentials and host")
    else:
        print("   ❌ URI missing credentials or host")
        print("   🔧 Format: mongodb+srv://username:password@cluster.mongodb.net/database")
        return False
    
    # Step 4: Test connection
    print(f"\n🔌 Testing MongoDB Connection...")
    try:
        # Create client with shorter timeout for testing
        client = AsyncIOMotorClient(
            mongo_uri,
            serverSelectionTimeoutMS=10000,  # 10 second timeout
            connectTimeoutMS=10000
        )
        
        # Test ping
        await asyncio.wait_for(client.admin.command('ping'), timeout=15.0)
        print("   ✅ Connection successful!")
        
        # Test database access
        database = client[mongo_db]
        
        # Try to list collections
        collections = await database.list_collection_names()
        print(f"   ✅ Database access successful!")
        print(f"   📁 Collections found: {len(collections)}")
        if collections:
            print(f"      Collections: {', '.join(collections[:5])}")
        
        # Test user collection access
        users_collection = database.users
        user_count = await users_collection.count_documents({})
        print(f"   👥 Users in database: {user_count}")
        
        # Close connection
        client.close()
        return True
        
    except asyncio.TimeoutError:
        print("   ❌ Connection timeout!")
        print("   🔧 Troubleshooting:")
        print("      1. Check your internet connection")
        print("      2. Verify MongoDB Atlas cluster is running")
        print("      3. Check if your IP is whitelisted in Network Access")
        return False
        
    except Exception as e:
        print(f"   ❌ Connection failed: {str(e)}")
        print("   🔧 Common solutions:")
        print("      1. Verify credentials (username/password)")
        print("      2. Check cluster name in URI")
        print("      3. Ensure IP is whitelisted in MongoDB Atlas")
        print("      4. Verify cluster is not paused")
        return False

def print_mongodb_setup_guide():
    """Print MongoDB Atlas setup guide"""
    print("\n📚 MongoDB Atlas Setup Guide:")
    print("=" * 50)
    
    print("1️⃣ Create MongoDB Atlas Account:")
    print("   - Go to https://www.mongodb.com/atlas")
    print("   - Create a free account")
    
    print("\n2️⃣ Create a Cluster:")
    print("   - Click 'Build a Database'")
    print("   - Choose 'Free' tier (M0)")
    print("   - Select a cloud provider and region")
    print("   - Click 'Create Cluster'")
    
    print("\n3️⃣ Create Database User:")
    print("   - Go to 'Database Access' in left sidebar")
    print("   - Click 'Add New Database User'")
    print("   - Choose 'Password' authentication")
    print("   - Set username and password")
    print("   - Give 'Atlas admin' privileges")
    
    print("\n4️⃣ Whitelist IP Address:")
    print("   - Go to 'Network Access' in left sidebar")
    print("   - Click 'Add IP Address'")
    print("   - Choose 'Allow Access from Anywhere' (0.0.0.0/0)")
    print("   - Or add your specific IP address")
    
    print("\n5️⃣ Get Connection String:")
    print("   - Go to 'Clusters' and click 'Connect'")
    print("   - Choose 'Connect your application'")
    print("   - Select 'Python' and version '3.6+'")
    print("   - Copy the connection string")
    
    print("\n6️⃣ Update .env File:")
    print("   Add to your .env file:")
    print("   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name")
    print("   MONGO_DB=github_analyzer")

async def main():
    """Main troubleshooting function"""
    print("🚀 Starting MongoDB troubleshooting...\n")
    
    success = await test_mongodb_connection()
    
    if not success:
        print_mongodb_setup_guide()
    else:
        print("\n🎉 MongoDB connection is working perfectly!")
        print("💡 Your authentication system should now store data in MongoDB Atlas")

if __name__ == "__main__":
    asyncio.run(main())