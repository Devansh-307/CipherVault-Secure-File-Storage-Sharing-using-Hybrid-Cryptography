import pytest
import os
import sys
from pathlib import Path

# Add backend to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app.schemas.auth import UserRegisterRequest
from app.services.auth_service import AuthService

TEST_DB_FILE = BASE_DIR / "test_ciphervault.db"
SQLALCHEMY_TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Pre-seed test users
    db = TestingSessionLocal()
    try:
        AuthService.register_user(
            db, 
            UserRegisterRequest(username="test_alice", email="test_alice@vault.io", password="SecretPassword123!", role="admin")
        )
        AuthService.register_user(
            db, 
            UserRegisterRequest(username="test_bob", email="test_bob@vault.io", password="SecretPassword123!", role="user")
        )
        AuthService.register_user(
            db, 
            UserRegisterRequest(username="test_eve", email="test_eve@vault.io", password="SecretPassword123!", role="user")
        )
    finally:
        db.close()

    yield

    Base.metadata.drop_all(bind=engine)
    if TEST_DB_FILE.exists():
        try:
            os.remove(TEST_DB_FILE)
        except OSError:
            pass

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
