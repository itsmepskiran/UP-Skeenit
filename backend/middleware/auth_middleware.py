# backend/middleware/auth_middleware.py
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, HTTPException
from utils_others.security import validate_supabase_token

PUBLIC_PATHS = [
    "/auth/login",
    "/auth/register",
    "/auth/verify",
    "/auth/update-password",
    "/health"
]

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # ✅ Skip OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # ✅ Skip public paths
        if any(path.startswith(p) for p in PUBLIC_PATHS):
            return await call_next(request)

        # 🔐 Auth check for protected routes
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=401, detail="Missing Authorization header")

        token = auth_header.replace("Bearer ", "").strip()
        user = validate_supabase_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        request.state.user = user
        return await call_next(request)


def require_role(role: str):
    """
    Decorator for role-based protection.
    """

    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            user = getattr(request.state, "user", None)
            if not user or user.get("role") != role:
                raise HTTPException(status_code=403, detail="Forbidden")
            return await func(request, *args, **kwargs)
        return wrapper

    return decorator
