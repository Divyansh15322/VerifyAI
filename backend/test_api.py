import os
import pytest
from fastapi.testclient import TestClient

# Ensure we use a test database
os.environ["DATABASE_URL"] = "sqlite:///./test_verifyai.db"

from app.main import app
from app.core.database import Base, engine

# Create the test tables
Base.metadata.create_all(bind=engine)

client = TestClient(app)

@pytest.fixture(autouse=True)
def cleanup():
    # Run tests
    yield
    # Clean up test database after all tests complete
    if os.path.exists("test_verifyai.db"):
        try:
            os.remove("test_verifyai.db")
        except Exception:
            pass

def test_health_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"
    assert response.json()["service"] == "VerifyAI"

def test_user_flow():
    # 1. Register a test user
    reg_payload = {
        "email": "testuser@verifyai.com",
        "password": "strongpassword123",
        "full_name": "Test Account"
    }
    reg_response = client.post("/api/auth/register", json=reg_payload)
    assert reg_response.status_code == 201
    assert reg_response.json()["email"] == "testuser@verifyai.com"
    assert reg_response.json()["role"] == "admin"  # First user gets auto-promoted to admin

    # 2. Login the registered user
    login_payload = {
        "email": "testuser@verifyai.com",
        "password": "strongpassword123"
    }
    login_response = client.post("/api/auth/login", json=login_payload)
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 3. Get profile details using token
    headers = {"Authorization": f"Bearer {token}"}
    profile_response = client.get("/api/auth/me", headers=headers)
    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == "testuser@verifyai.com"

    # 4. Fetch verifications (should be empty initially)
    history_response = client.get("/api/verifications/", headers=headers)
    assert history_response.status_code == 200
    assert isinstance(history_response.json(), list)
    assert len(history_response.json()) == 0

    # 5. Fetch admin statistics
    stats_response = client.get("/api/admin/stats", headers=headers)
    assert stats_response.status_code == 200
    assert stats_response.json()["users"]["total"] == 1
    assert stats_response.json()["verifications"]["total"] == 0

if __name__ == "__main__":
    # If run directly, run pytest
    import sys
    sys.exit(pytest.main([__file__]))
