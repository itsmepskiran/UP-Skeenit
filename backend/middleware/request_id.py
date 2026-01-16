# backend/middleware/request_id.py
import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow client to send their own request ID
        incoming_id = request.headers.get("X-Request-ID")

        # Generate a shorter, readable ID if none provided
        request_id = incoming_id or uuid.uuid4().hex[:12]

        # Attach to request state for logging
        request.state.request_id = request_id

        try:
            response = await call_next(request)
        except Exception as e:
            # Even error responses should include request ID
            from fastapi.responses import JSONResponse
            response = JSONResponse(
                status_code=500,
                content={"error": "Internal Server Error", "request_id": request_id}
            )
            raise e
        finally:
            # Always add header
            response.headers["X-Request-ID"] = request_id

        return response
