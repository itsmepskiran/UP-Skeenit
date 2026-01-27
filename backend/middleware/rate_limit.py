# backend/middleware/rate_limit.py

import time
import asyncio
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from utils_others.logger import logger


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter.
    Thread-safe and async-safe using asyncio.Lock().
    """

    def __init__(
        self,
        app,
        max_requests: int = 100,
        window: int = 900,
        excluded_paths: set | None = None,
        path_overrides: dict | None = None
    ):
        super().__init__(app)
        self.max_requests = max_requests
        self.window = window
        self.excluded_paths = excluded_paths or set()
        self.path_overrides = path_overrides or {}

        self.requests = {}  # { ip: [timestamps] }
        self.lock = asyncio.Lock()  # async-safe

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip excluded paths
        if path in self.excluded_paths:
            return await call_next(request)

        # Determine client IP
        client_ip = request.headers.get("x-forwarded-for")
        if client_ip:
            client_ip = client_ip.split(",")[0].strip()
        else:
            client_ip = request.client.host

        now = time.time()

        # Path-specific override
        limit = self.path_overrides.get(path, self.max_requests)

        async with self.lock:
            timestamps = self.requests.get(client_ip, [])
            timestamps = [t for t in timestamps if now - t < self.window]

            # Enforce limit
            if len(timestamps) >= limit:
                logger.warning("Rate limit exceeded", extra={
                    "ip": client_ip,
                    "path": path,
                    "limit": limit
                })
                return JSONResponse(
                    status_code=429,
                    content={
                        "ok": False,
                        "error": "Too many requests. Please try again later."
                    },
                    headers={"Retry-After": str(self.window)}
                )

            # Record request
            timestamps.append(now)
            self.requests[client_ip] = timestamps

            # Cleanup empty entries
            if not timestamps:
                self.requests.pop(client_ip, None)

        return await call_next(request)
