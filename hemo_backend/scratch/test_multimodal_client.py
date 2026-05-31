import os
import sys
from dotenv import load_dotenv

# Load env
load_dotenv()

# Add parent path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, User, hash_password

def setup_test_user():
    db = SessionLocal()
    username = "test_premium_user"
    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = User(
            username=username,
            email="test_premium@medhemo.com",
            hashed_password=hash_password("password123"),
            subscription_status="active",
            stripe_customer_id="cus_test_123"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print("Created test premium user.")
    else:
        user.subscription_status = "active"
        db.commit()
        print("Ensured test user is active.")
    db.close()
    return username

def test():
    username = setup_test_user()
    client = TestClient(app)
    
    import base64
    img_bytes = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
    
    files = {
        "image": ("test.png", img_bytes, "image/png")
    }
    data = {
        "text": "peux tu me decrire cette image",
        "history_json": "[]",
        "tts": "true",
        "voice_type": "lila",
        "username": username
    }
    
    print(f"Sending POST request to /api/multimodal as '{username}'...")
    try:
        response = client.post("/api/multimodal", data=data, files=files)
        print("Status code:", response.status_code)
        print("JSON response:", response.text)
    except Exception as e:
        print("EXCEPTION:", e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
