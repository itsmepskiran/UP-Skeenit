# backend/middleware/auth_middleware.py

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, HTTPException
from utils_others.security import validate_supabase_token
from utils_others.logger import logger


# Public endpoints that do NOT require authentication
PUBLIC_PATHS = [
    "/",                        # Root
    "/favicon.ico",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/health",
    "/static",

    # Auth endpoints that must remain public
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/confirm-email",
    "/api/v1/auth/reset-password",
]


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Global authentication middleware.
    Validates Supabase JWT for all protected routes.
    """

    def __init__(self, app, excluded_paths=None):
        super().__init__(app)
        self.excluded_paths = excluded_paths or set()

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Allow CORS preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        # Allow excluded paths (from main.py)
        if path in self.excluded_paths:
            return await call_next(request)

        # Allow public paths
        if any(path.startswith(p) for p in PUBLIC_PATHS):
            return await call_next(request)

        # Require Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.warning("Missing Authorization header", extra={"path": path})
            raise HTTPException(status_code=401, detail="Missing Authorization header")

        token = auth_header.replace("Bearer ", "").strip()

        # Validate Supabase JWT
        user = validate_supabase_token(token)
        if not user:
            logger.warning("Invalid or expired token", extra={"path": path})
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Attach user to request
        request.state.user = user
        return await call_next(request)


def require_role(role: str):
    """
    Decorator for role-based protection.
    Works for function-based routes.
    """

    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            user = getattr(request.state, "user", None)

            if not user:
                raise HTTPException(status_code=401, detail="Unauthorized")

            if user.get("role") != role:
                logger.warning("Forbidden role access", extra={
                    "required_role": role,
                    "user_role": user.get("role")
                })
                raise HTTPException(status_code=403, detail="Forbidden")

            return await func(request, *args, **kwargs)

        return wrapper

    return decorator
