# migrate_to_mongodb.py - Migrate user data from JSON file to MongoDB

import os
import json
import asyncio
import logging
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

async def migrate_users():
    """Migrate users from users_temp.json to MongoDB"""
    
    print("🔄 User Data Migration Tool")
    print("=" * 40)
    
    # Check if JSON file exists
    json_file = "users_temp.json"
    if not os.path.exists(json_file):
        print(f"ℹ️  No {json_file} found - nothing to migrate")
        return True
    
    # Load users from JSON file
    try:
        with open(json_file, 'r') as f:
            users = json.load(f)
        print(f"📄 Found {len(users)} users in {json_file}")
    except Exception as e:
        print(f"❌ Error reading {json_file}: {e}")
        return False
    
    if not users:
        print(f"ℹ️  No users to migrate")
        return True
    
    # Get MongoDB configuration
    mongo_uri = os.getenv("MONGO_URI")
    mongo_db = os.getenv("MONGO_DB", "github_analyzer")
    
    if not mongo_uri:
        print(f"❌ MONGO_URI not set in environment")
        return False
    
    try:
        # Connect to MongoDB
        print(f"🔌 Connecting to MongoDB...")
        client = AsyncIOMotorClient(
            mongo_uri,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000
        )
        
        # Test connection
        await client.admin.command('ping')
        database = client[mongo_db]
        users_collection = database.users
        
        print(f"✅ Connected to MongoDB")
        
        # Check existing users in MongoDB
        existing_count = await users_collection.count_documents({})
        print(f"📊 Existing users in MongoDB: {existing_count}")
        
        # Migrate users
        migrated = 0
        skipped = 0
        
        for user in users:
            try:
                # Convert string dates to datetime objects
                if isinstance(user.get('created_at'), str):
                    user['created_at'] = datetime.fromisoformat(user['created_at'])
                if isinstance(user.get('updated_at'), str):
                    user['updated_at'] = datetime.fromisoformat(user['updated_at'])
                
                # Remove the old 'id' field since MongoDB will create _id
                if 'id' in user:
                    del user['id']
                
                # Check if user already exists
                existing_user = await users_collection.find_one({"email": user['email']})
                
                if existing_user:
                    print(f"   ⏭️  Skipping {user['email']} (already exists)")
                    skipped += 1
                else:
                    # Insert new user
                    await users_collection.insert_one(user)
                    print(f"   ✅ Migrated {user['email']}")
                    migrated += 1
                    
            except Exception as e:
                print(f"   ❌ Error migrating {user.get('email', 'unknown')}: {e}")
        
        print(f"\n📊 Migration Summary:")
        print(f"   ✅ Successfully migrated: {migrated} users")
        print(f"   ⏭️  Skipped (already exists): {skipped} users")
        print(f"   🗄️  Total users in MongoDB: {await users_collection.count_documents({})}")
        
        # Close connection
        client.close()
        
        # Ask if user wants to backup/remove JSON file
        if migrated > 0:
            print(f"\n🔄 Migration completed successfully!")
            print(f"💡 Recommendations:")
            print(f"   1. Your app will now use MongoDB for user storage")
            print(f"   2. You can backup {json_file} and remove it")
            print(f"   3. Update your auth_service.py to use the MongoDB version")
            
            # Create backup
            backup_file = f"{json_file}.backup"
            try:
                import shutil
                shutil.copy2(json_file, backup_file)
                print(f"   ✅ Created backup: {backup_file}")
            except Exception as e:
                print(f"   ⚠️  Could not create backup: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print(f"🔧 Troubleshooting:")
        print(f"   1. Check your MongoDB Atlas connection")
        print(f"   2. Verify MONGO_URI in .env file")
        print(f"   3. Run mongodb_troubleshoot.py for detailed diagnostics")
        return False

async def verify_mongodb_setup():
    """Verify MongoDB is properly set up for the application"""
    
    print(f"\n🔍 Verifying MongoDB Setup...")
    
    mongo_uri = os.getenv("MONGO_URI")
    mongo_db = os.getenv("MONGO_DB", "github_analyzer")
    
    if not mongo_uri:
        return False
    
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        
        client = AsyncIOMotorClient(mongo_uri)
        database = client[mongo_db]
        
        # Test connection
        await client.admin.command('ping')
        
        # Check indexes
        users_collection = database.users
        indexes = await users_collection.list_indexes().to_list(length=None)
        
        print(f"   ✅ MongoDB connection working")
        print(f"   📊 Database indexes: {len(indexes)}")
        
        # List index names
        index_names = [idx.get('name', 'unnamed') for idx in indexes]
        print(f"   📋 Indexes: {', '.join(index_names)}")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"   ❌ MongoDB verification failed: {e}")
        return False

def print_next_steps():
    """Print next steps for the user"""
    print(f"\n🎯 Next Steps:")
    print(f"=" * 40)
    print(f"1. Replace your current auth_service.py with the MongoDB version")
    print(f"2. Update your app/core/db.py with the enhanced version") 
    print(f"3. Run the application: python run.py")
    print(f"4. Test authentication through the web interface")
    print(f"5. Check MongoDB Atlas to see user data being saved")
    
    print(f"\n🛠️  If you encounter issues:")
    print(f"   • Run: python mongodb_troubleshoot.py")
    print(f"   • Check MongoDB Atlas Network Access settings")
    print(f"   • Verify your .env configuration")

async def main():
    """Main migration and verification process"""
    print("Starting application setup and migration...\n")
    
    # Step 1: Run basic diagnostics
    success = await run_diagnostics() if 'run_diagnostics' in globals() else True
    
    # Step 2: Migrate existing data
    if success:
        success = await migrate_users()
    
    # Step 3: Verify setup
    if success:
        success = await verify_mongodb_setup()
    
    # Step 4: Print next steps
    if success:
        print(f"\n🎉 Setup completed successfully!")
        print_next_steps()
    else:
        print(f"\n❌ Setup encountered issues")
        print(f"🔧 Please resolve the issues above and try again")

if __name__ == "__main__":
    asyncio.run(main())