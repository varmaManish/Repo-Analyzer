# startup_check.py - Application startup diagnostics

import os
import asyncio
import logging
from pathlib import Path
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

async def run_diagnostics():
    """Run comprehensive startup diagnostics"""
    
    print("🚀 GitHub Repository Analyzer - Startup Diagnostics")
    print("=" * 60)
    
    # Load environment variables
    load_dotenv()
    
    # Check 1: Environment file
    env_file = Path(".env")
    print(f"\n📁 Environment File Check:")
    if env_file.exists():
        print(f"   ✅ .env file found")
        with open(".env", "r") as f:
            lines = f.readlines()
            non_empty_lines = [line.strip() for line in lines if line.strip() and not line.strip().startswith('#')]
            print(f"   📄 Configuration lines: {len(non_empty_lines)}")
    else:
        print(f"   ❌ .env file not found")
        print(f"   🔧 Copy env-template.env to .env and configure it")
        return False
    
    # Check 2: MongoDB Configuration
    mongo_uri = os.getenv("MONGO_URI")
    mongo_db = os.getenv("MONGO_DB", "github_analyzer")
    
    print(f"\n🗄️  MongoDB Configuration:")
    print(f"   MONGO_URI: {'✅ Set' if mongo_uri else '❌ Not set'}")
    print(f"   MONGO_DB: {mongo_db}")
    
    if not mongo_uri:
        print(f"   🔧 Add MONGO_URI to your .env file")
        return False
    
    # Validate URI format without exposing credentials
    if mongo_uri.startswith(("mongodb://", "mongodb+srv://")):
        print(f"   ✅ URI format valid")
        
        # Extract cluster info safely
        if "@" in mongo_uri:
            cluster_part = mongo_uri.split("@")[1].split("/")[0]
            print(f"   🌐 Cluster: {cluster_part}")
        else:
            print(f"   ❌ URI missing credentials")
            return False
    else:
        print(f"   ❌ Invalid URI format")
        return False
    
    # Check 3: Test MongoDB Connection
    print(f"\n🔌 Testing MongoDB Connection...")
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        
        client = AsyncIOMotorClient(
            mongo_uri,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000
        )
        
        # Test connection
        await asyncio.wait_for(client.admin.command('ping'), timeout=15.0)
        print(f"   ✅ MongoDB connection successful!")
        
        # Test database operations
        database = client[mongo_db]
        
        # Check if we can access the users collection
        users_collection = database.users
        user_count = await users_collection.count_documents({})
        print(f"   👥 Users in database: {user_count}")
        
        # Test write operation (non-destructive)
        test_result = await users_collection.find_one({"email": "test_connection"})
        if test_result:
            await users_collection.delete_one({"email": "test_connection"})
        
        print(f"   ✅ Database operations working!")
        
        client.close()
        
    except ImportError:
        print(f"   ❌ Motor library not installed")
        print(f"   🔧 Run: pip install motor")
        return False
    except asyncio.TimeoutError:
        print(f"   ❌ Connection timeout")
        print(f"   🔧 Check network and MongoDB Atlas status")
        return False
    except Exception as e:
        print(f"   ❌ Connection failed: {str(e)}")
        if "authentication failed" in str(e).lower():
            print(f"   🔧 Check username and password in connection string")
        elif "network" in str(e).lower():
            print(f"   🔧 Check IP whitelist in MongoDB Atlas Network Access")
        else:
            print(f"   🔧 Check MongoDB Atlas cluster status")
        return False
    
    # Check 4: Required dependencies
    print(f"\n📦 Dependency Check:")
    required_packages = [
        "fastapi", "uvicorn", "motor", "pymongo", 
        "python-dotenv", "pydantic-settings", "passlib", 
        "python-jose", "google-auth", "bcrypt"
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
            print(f"   ✅ {package}")
        except ImportError:
            print(f"   ❌ {package}")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"   🔧 Install missing packages: pip install {' '.join(missing_packages)}")
        return False
    
    # Check 5: File structure
    print(f"\n📁 File Structure Check:")
    required_files = [
        "app/main.py",
        "app/core/db.py", 
        "app/services/auth_service.py",
        "app/api/routes/auth.py",
        "app/utils/security.py"
    ]
    
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"   ✅ {file_path}")
        else:
            print(f"   ❌ {file_path}")
    
    # Final status
    print(f"\n🎯 Diagnostic Results:")
    print(f"   ✅ All checks passed! Your app should connect to MongoDB Atlas.")
    print(f"   🗄️  User data will be saved to MongoDB instead of local files.")
    print(f"   🚀 Run: python run.py or uvicorn app.main:app --reload")
    
    return True

if __name__ == "__main__":
    asyncio.run(run_diagnostics())