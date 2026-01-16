# backend/middleware/rate_limit.py
import time
from fastapi import Request
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window: int = 900):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window
        self.requests = {}

    async def dispatch(self, request: Request, call_next):
        # Get client IP (supports proxies)
        client_ip = request.headers.get("x-forwarded-for")
        if client_ip:
            client_ip = client_ip.split(",")[0].strip()
        else:
            client_ip = request.client.host

        now = time.time()

        # Clean old timestamps
        timestamps = self.requests.get(client_ip, [])
        timestamps = [t for t in timestamps if now - t < self.window]
        self.requests[client_ip] = timestamps

        # Enforce limit
        if len(timestamps) >= self.max_requests:
            return Response(
                content="Too Many Requests",
                status_code=429,
                headers={"Retry-After": str(self.window)}
            )

        # Record request
        timestamps.append(now)
        self.requests[client_ip] = timestamps

        # Cleanup empty IP entries
        if not timestamps:
            self.requests.pop(client_ip, None)

        return await call_next(request)
