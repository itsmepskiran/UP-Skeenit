# backend/middleware/role_required.py

from functools import wraps
from fastapi import Request, HTTPException
from utils_others.logger import logger


def _extract_role(user: dict):
    """
    Extract role from Supabase JWT.
    Supports multiple possible locations.
    """
    return (
        user.get("role") or
        user.get("user_metadata", {}).get("role") or
        user.get("app_metadata", {}).get("role")
    )


def require_role(required_roles):
    """
    Decorator for role-based access control.
    Supports:
        @require_role("recruiter")
        @require_role(["recruiter", "admin"])
    """

    # Normalize to list
    if isinstance(required_roles, str):
        required_roles = [required_roles]

    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            user = getattr(request.state, "user", None)
            request_id = getattr(request.state, "request_id", "unknown")

            if not user:
                logger.error("Missing user in request.state", extra={
                    "request_id": request_id,
                    "path": request.url.path
                })
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required"
                )

            actual_role = _extract_role(user)

            if actual_role not in required_roles:
                logger.warning("Forbidden role access", extra={
                    "request_id": request_id,
                    "path": request.url.path,
                    "required_roles": required_roles,
                    "actual_role": actual_role,
                    "user_id": user.get("sub")
                })
                raise HTTPException(
                    status_code=403,
                    detail=f"Forbidden: requires {required_roles}, got {actual_role}"
                )

            return await func(request, *args, **kwargs)

        return wrapper

    return decorator
