import os
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from utils_others.logger import logger
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, applicant, recruiter, dashboard, analytics, notification, video
from routers import frontend_compat

from middleware.security_headers import SecurityHeadersMiddleware
from middleware.rate_limit import RateLimitMiddleware
from middleware.auth_middleware import AuthMiddleware


# ---------------------------------------------------------
# Initialize FastAPI
# ---------------------------------------------------------
app = FastAPI(
    title="Skreenit API",
    description="Backend API for Skreenit recruitment platform",
    version="1.0.0"
)

# Load .env from the backend directory so env vars are available
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Masking helper for logs
def _mask(v: str | None) -> str | None:
    if not v:
        return None
    v = str(v)
    return (v[:8] + '...') if len(v) > 12 else '***'

# Startup masked env log
logger.info("Startup env", extra={
    "SUPABASE_URL": _mask(os.getenv("SUPABASE_URL")),
    "SUPABASE_SERVICE_ROLE_KEY_set": bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY")),
    "SUPABASE_REDIRECT_URL": os.getenv("SUPABASE_REDIRECT_URL")
})

# Note: CORS middleware is added after origins are computed below
# ---------------------------------------------------------
# Security Middleware (will be registered after CORS below)
# ---------------------------------------------------------
# We'll add CORS once (see CORS Configuration section) and ensure
# it is registered before these security middlewares.


# ---------------------------------------------------------
# Health Check
# ---------------------------------------------------------
@app.get("/health")
async def health_check_root():
    """Root health endpoint for load balancers and monitoring."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }


# ---------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS")

if ALLOWED_ORIGINS:
    origins = [x.strip() for x in ALLOWED_ORIGINS.split(",")]
else:
    origins = [
        # Local development
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "https://localhost:3000",
        "https://127.0.0.1:3000",
        "https://127.0.0.1:5173",

        # Production domains
        "https://www.skreenit.com",
        "https://skreenit.com",
        "https://login.skreenit.com",
        "https://auth.skreenit.com",
        "https://applicant.skreenit.com",
        "https://recruiter.skreenit.com",
        "https://dashboard.skreenit.com",
        "https://app.skreenit.com",
        "https://hrms.skreenit.com",

        # Dev subdomains
        "http://auth.localhost:3000",
        "http://login.localhost:3000",
        "http://dashboard.localhost:3000",
        "http://applicant.localhost:3000",
        "http://recruiter.localhost:3000"
    ]


def validate_origins(origins_list):
    validated = []
    for origin in origins_list:
        origin = origin.strip()
        if not origin:
            continue

        if not origin.startswith(("http://", "https://")):
            print(f"Warning: Invalid origin format: {origin}")
            continue

        if os.getenv("NODE_ENV") == "production":
            allowed_domains = [".skreenit.com"]
            if not any(domain in origin for domain in allowed_domains):
                print(f"Warning: Production origin not allowed: {origin}")
                continue

        validated.append(origin)

    return validated


origins = validate_origins(origins)

if not origins:
    origins = ["http://localhost:3000"]
    print("Warning: No valid origins configured. Using localhost fallback.")

# Register CORS middleware first (must be before other middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "User-Agent",
        "DNT",
        "Cache-Control",
        "X-Mx-ReqToken",
        "Keep-Alive",
        "X-Requested-With",
        "If-Modified-Since"
    ],
)

# Now register the security-related middlewares after CORS
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=200, window=900)
app.add_middleware(AuthMiddleware)


# -----------------------------
# Global Exception Handlers
# -----------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("Request validation error", extra={"path": request.url.path, "method": request.method, "errors": exc.errors()})
    return JSONResponse(
        status_code=422,
        content={"ok": False, "error": {"message": "Validation error", "details": exc.errors()}},
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    logger.error("ValueError", extra={"path": request.url.path, "method": request.method, "error": str(exc)})
    return JSONResponse(status_code=400, content={"ok": False, "error": {"message": str(exc)}})


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    logger.error("RuntimeError", extra={"path": request.url.path, "method": request.method, "error": str(exc)})
    return JSONResponse(status_code=500, content={"ok": False, "error": {"message": "Internal server error"}})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled Exception", exc_info=exc, extra={"path": request.url.path, "method": request.method})
    return JSONResponse(status_code=500, content={"ok": False, "error": {"message": "Internal server error"}})


# ---------------------------------------------------------
# API Versioning + Router Registration
# ---------------------------------------------------------
api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(applicant.router, prefix="/applicant", tags=["Applicant"])
api_router.include_router(recruiter.router, prefix="/recruiter", tags=["Recruiter"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(notification.router, prefix="/notification", tags=["Notification"])
api_router.include_router(video.router, prefix="/video", tags=["Video"])

# Frontend compatibility endpoints (keep frontend unchanged)
api_router.include_router(frontend_compat.router)

# Health check under versioned API
@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

# Compatibility mounts: expose single-prefixed endpoints as well
api_router.include_router(applicant.router, tags=["Applicant"])
api_router.include_router(recruiter.router, tags=["Recruiter"])
api_router.include_router(dashboard.router, tags=["Dashboard"])
api_router.include_router(analytics.router, tags=["Analytics"])
api_router.include_router(video.router, tags=["Video"])

app.include_router(api_router)
