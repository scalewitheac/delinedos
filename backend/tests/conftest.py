import os
from typing import Iterator
import pytest
import requests

BASE_URL: str = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://creative-canvas-602.preview.emergentagent.com",
).rstrip("/")

# New Delined credentials (see /app/memory/test_credentials.md)
ADMIN_EMAIL: str = os.environ.get("ADMIN_EMAIL", "delinedreferal0@gmail.com")
ADMIN_PASSWORD: str = os.environ.get("ADMIN_PASSWORD", "U9d0wNL3FTm4in!$")
SITE_PASSWORD: str = os.environ.get("SITE_PASSWORD", "$T4r7newS4V3")


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest.fixture(scope="session")
def site_password() -> str:
    return SITE_PASSWORD


@pytest.fixture(scope="session")
def admin_password() -> str:
    return ADMIN_PASSWORD


@pytest.fixture(scope="session")
def admin_email() -> str:
    return ADMIN_EMAIL


@pytest.fixture(scope="session")
def api_client() -> Iterator[requests.Session]:
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    yield s
    s.close()


@pytest.fixture(scope="session")
def admin_token(api_client: requests.Session) -> str:
    r = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
