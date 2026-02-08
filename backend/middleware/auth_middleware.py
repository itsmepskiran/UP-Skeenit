# backend/middleware/auth_middleware.py
import os
import jwt
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from utils_others.logger import logger

# ... (Imports and Config remain the same) ...

class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, excluded_paths=None):
        super().__init__(app)
        self.excluded_paths = excluded_paths or set()

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # 1. Allow CORS preflight & Excluded Paths
        if request.method == "OPTIONS" or path in self.excluded_paths:
            return await call_next(request)

        # 2. Allow Static Files & Logos
        if path.startswith("/logos") or path.startswith("/static"):
             return await call_next(request)

        # 3. Allow public paths
        clean_path = path.split("?")[0].rstrip("/") 
        if clean_path in [
            "/", "", "/favicon.ico", "/docs", "/openapi.json", "/redoc", "/health",
            "/api/v1/auth/login", "/api/v1/auth/register", 
            "/api/v1/auth/confirm-email", "/api/v1/auth/reset-password"
        ]:
            return await call_next(request)

        # 4. Require Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return JSONResponse(status_code=401, content={"detail": "Missing Authorization header"})

        token = auth_header.replace("Bearer ", "").strip()
        secret = os.getenv("SUPABASE_JWT_SECRET", "").strip()

        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )

            # ✅ CRITICAL FIX: Map 'sub' (from JWT) to 'id' (expected by your code)
            payload["id"] = payload.get("sub")

            request.state.user = payload

        except Exception as e:
            logger.error(f"Token error: {str(e)}")
            return JSONResponse(status_code=401, content={"detail": "Invalid Token"})

        return await call_next(request)