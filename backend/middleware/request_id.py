# backend/middleware/request_id.py

import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from utils_others.logger import logger


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow client to send their own request ID
        incoming_id = request.headers.get("X-Request-ID")

        # Generate a short readable ID
        request_id = incoming_id or uuid.uuid4().hex[:12]

        # Attach to request state for logging
        request.state.request_id = request_id

        try:
            response = await call_next(request)

        except Exception as e:
            # Log the error with request ID
            logger.error("Unhandled exception", extra={
                "request_id": request_id,
                "path": request.url.path,
                "error": str(e)
            })

            # Return consistent error format
            return JSONResponse(
                status_code=500,
                content={
                    "ok": False,
                    "error": "Internal server error",
                    "request_id": request_id
                }
            )

        # Always add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        return response
