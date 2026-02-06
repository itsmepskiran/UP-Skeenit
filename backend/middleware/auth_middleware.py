# backend/middleware/auth_middleware.py

import os
from dotenv import load_dotenv
load_dotenv()

import jwt
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse  # ✅ Added for graceful errors
from utils_others.logger import logger

# Load Supabase JWT secret
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
if not SUPABASE_JWT_SECRET:
    raise RuntimeError("SUPABASE_JWT_SECRET is not set in environment variables")


# Public endpoints that do NOT require authentication
PUBLIC_PATHS = [
    "/",                        # Root
    "",                         # ⭐ REQUIRED because clean_path becomes "" for "/"
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

# Additional paths to exclude from authentication
EXCLUDED_PATHS = [
    "/health",
    "/api/v1/health",
    "/api/v1/system/info",
    "/api/v1/system/db-health",
    "/api/v1/auth/confirm-email"
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

        # 1. Allow CORS preflight
        if request.method == "OPTIONS":
            return await call_next(request)

        # 2. Allow excluded paths (from main.py)
        if path in self.excluded_paths:
            return await call_next(request)

        # 3. ✅ FIX: Allow Static Files & Logos (Prefix Check)
        # This prevents 401 errors for images
        if path.startswith("/logos") or path.startswith("/static"):
             return await call_next(request)

        # 4. Allow public paths
        clean_path = path.split("?")[0].rstrip("/") 
        if clean_path in PUBLIC_PATHS:
            return await call_next(request)

        # 5. Require Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.warning("Missing Authorization header", extra={"path": path})
            # ✅ FIX: Return JSON instead of raising Exception to prevent stack trace
            return JSONResponse(status_code=401, content={"detail": "Missing Authorization header"})

        token = auth_header.replace("Bearer ", "").strip()

        # ---------------------------------------------------------
        # Validate Supabase JWT (inline, no external module)
        # ---------------------------------------------------------
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False}  # Supabase tokens do not include 'aud'
            )

            # Check expiration manually (optional, but safe)
            exp = payload.get("exp")
            if exp and datetime.utcnow().timestamp() > exp:
                # ✅ FIX: Return JSON instead of raising Exception
                return JSONResponse(status_code=401, content={"detail": "Token expired"})

        except jwt.ExpiredSignatureError:
            logger.warning("Expired token", extra={"path": path})
            return JSONResponse(status_code=401, content={"detail": "Token expired"})

        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}", extra={"path": path})
            return JSONResponse(status_code=401, content={"detail": "Invalid token"})

        except Exception as e:
            logger.error(f"Token validation error: {str(e)}", extra={"path": path})
            return JSONResponse(status_code=500, content={"detail": "Token validation error"})

        # Attach decoded user to request
        request.state.user = payload

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