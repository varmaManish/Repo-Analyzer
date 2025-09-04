# quick_github_fix.py - Quick fix for GitHub 403 errors

import os
from dotenv import load_dotenv

def quick_fix():
    print("🚨 GITHUB 403 ERROR QUICK FIX")
    print("=" * 35)
    
    # Load environment variables
    load_dotenv()
    
    # Check 1: .env file exists
    if not os.path.exists('.env'):
        print("❌ No .env file found!")
        print("🔧 SOLUTION:")
        print("   1. Create .env file in your project root")
        print("   2. Add: GITHUB_TOKEN=your_github_token_here")
        return
    
    print("✅ .env file found")
    
    # Check 2: GITHUB_TOKEN exists
    with open('.env', 'r') as f:
        env_content = f.read()
    
    if 'GITHUB_TOKEN=' not in env_content:
        print("❌ GITHUB_TOKEN not found in .env!")
        print("🔧 SOLUTION:")
        print("   Add this line to your .env file:")
        print("   GITHUB_TOKEN=your_github_token_here")
        return
    
    # Check 3: Token value
    token = os.getenv("GITHUB_TOKEN")
    
    if not token or token == "your_github_token_here":
        print("❌ GITHUB_TOKEN is empty or placeholder!")
        print("🔧 SOLUTION:")
        print("   1. Go to: https://github.com/settings/tokens")
        print("   2. Generate new token with 'repo' and 'user' scopes")
        print("   3. Update .env: GITHUB_TOKEN=ghp_your_actual_token")
        print("   4. Restart your FastAPI server")
        return
    
    print(f"✅ GITHUB_TOKEN found: {token[:10]}...")
    
    # Test token quickly
    try:
        import requests
        response = requests.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {token}"},
            timeout=5
        )
        
        if response.status_code == 200:
            user = response.json()
            print(f"✅ Token works! Authenticated as: {user['login']}")
            print("✅ Your GitHub API should work now!")
            print("🔄 Make sure to restart your FastAPI server")
        elif response.status_code == 401:
            print("❌ Token is invalid!")
            print("🔧 Generate a new token from GitHub settings")
        elif response.status_code == 403:
            print("❌ Token lacks permissions or rate limited!")
            print("🔧 Generate new token with 'repo' and 'user' scopes")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            
    except ImportError:
        print("⚠️  Install requests: pip install requests")
    except Exception as e:
        print(f"⚠️  Could not test token: {e}")
    
    print("\n" + "=" * 35)
    print("🔄 RESTART YOUR FASTAPI SERVER after fixing!")

if __name__ == "__main__":
    quick_fix()