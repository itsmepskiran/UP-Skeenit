import os
import httpx
from fastapi import HTTPException, Header
from typing import Optional, Dict, Any

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def get_user_from_bearer(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Validates a Supabase JWT access token and returns user info + role.
    Accepts either:
    - "Bearer <token>"
    - "<token>"
    """

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")

    # Extract token
    token = authorization.split(" ", 1)[1] if authorization.lower().startswith("bearer ") else authorization

    # Validate token via Supabase Auth
    user = validate_supabase_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    return user


def validate_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Calls Supabase /auth/v1/user to validate the token.
    Returns user metadata including role.
    """

    if not SUPABASE_URL or not SERVICE_KEY:
        raise RuntimeError("Supabase credentials missing in environment variables.")

    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": SERVICE_KEY,
    }

    try:
        resp = httpx.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers)
        if resp.status_code != 200:
            return None

        data = resp.json()

        # Extract role from user_metadata
        role = None
        meta = data.get("user_metadata") or {}
        if isinstance(meta, dict):
            role = meta.get("role")

        return {
            "id": data.get("id"),
            "email": data.get("email"),
            "role": role,
            "raw": data
        }

    except Exception:
        return None


def ensure_role(user: dict, required_role: str) -> None:
    """
    Ensures the user has the required role.
    """
    if user.get("role") != required_role:
        raise HTTPException(status_code=403, detail="Forbidden: insufficient role.")
