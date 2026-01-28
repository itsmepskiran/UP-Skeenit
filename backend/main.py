import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter

from fastapi.middleware.cors import CORSMiddleware

from utils_others.logger import logger
from utils_others.error_handler import register_exception_handlers

from middleware.security_headers import SecurityHeadersMiddleware
from middleware.rate_limit import RateLimitMiddleware
from middleware.auth_middleware import AuthMiddleware, EXCLUDED_PATHS

from routers import (
    auth,
    applicant,
    recruiter,
    dashboard,
    analytics,
    notification,
    video
)

# ---------------------------------------------------------
# Load Environment
# ---------------------------------------------------------
BASE_DIR = os.path.dirname(__file__)
load_dotenv(os.path.join(BASE_DIR, ".env"))

ENV = os.getenv("ENVIRONMENT", "development")
IS_PROD = ENV == "production"

# ---------------------------------------------------------
# Initialize FastAPI
# ---------------------------------------------------------
app = FastAPI(
    title="Skreenit API",
    description="Backend API for Skreenit recruitment platform",
    version="1.0.0",
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url="/openapi.json",
)

# ---------------------------------------------------------
# Masked Env Logging
# ---------------------------------------------------------
def _mask(v: str | None) -> str | None:
    if not v:
        return None
    v = str(v)
    return (v[:8] + "...") if len(v) > 12 else "***"

logger.info("Backend Startup", extra={
    "environment": ENV,
    "supabase_url": _mask(os.getenv("SUPABASE_URL")),
    "service_role_key_present": bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY")),
})

# ---------------------------------------------------------
# Health Check (Root)
# ---------------------------------------------------------
@app.get("/health")
async def health_root():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": ENV
    }

# ---------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------
DEFAULT_ALLOWED_ORIGINS = [
    "https://www.skreenit.com",
    "https://skreenit.com",
    "https://login.skreenit.com",
    "https://auth.skreenit.com",
    "https://applicant.skreenit.com",
    "https://recruiter.skreenit.com",
    "https://dashboard.skreenit.com",
    "https://backend.skreenit.com",
    "https://aiskreenit.onrender.com",
]

LOCAL_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

origins = DEFAULT_ALLOWED_ORIGINS if IS_PROD else DEFAULT_ALLOWED_ORIGINS + LOCAL_DEV_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Middleware
# ---------------------------------------------------------
app.add_middleware(
    RateLimitMiddleware,
    max_requests=200,
    window=900,
    excluded_paths=EXCLUDED_PATHS,
    path_overrides={
        "/api/v1/auth/login": 10,
        "/api/v1/auth/register": 5,
        "/api/v1/auth/confirm-email": 20,
    }
)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(AuthMiddleware, excluded_paths=EXCLUDED_PATHS)

# ---------------------------------------------------------
# Exception Handlers
# ---------------------------------------------------------
register_exception_handlers(app)

# ---------------------------------------------------------
# API Router (Versioned)
# ---------------------------------------------------------
api = APIRouter(prefix="/api/v1")

api.include_router(auth.router, tags=["Authentication"])
api.include_router(applicant.router, tags=["Applicant"])
api.include_router(recruiter.router, tags=["Recruiter"])
api.include_router(dashboard.router, tags=["Dashboard"])
api.include_router(analytics.router, tags=["Analytics"])
api.include_router(notification.router, tags=["Notification"])
api.include_router(video.router, tags=["Video"])

# Versioned health check
@api.get("/health")
async def versioned_health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": ENV
    }

# System info endpoint
@api.get("/system/info")
async def system_info():
    return {
        "environment": ENV,
        "python_version": os.sys.version,
        "fastapi_version": "1.0.0",
    }

# DB health placeholder
@api.get("/system/db-health")
async def db_health():
    return {"status": "ok"}

app.include_router(api)

# ---------------------------------------------------------
# Startup / Shutdown Events
# ---------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    logger.info("Skreenit Backend Started", extra={"event": "startup"})

@app.on_event("shutdown")
async def on_shutdown():
    logger.info("Skreenit Backend Stopped", extra={"event": "shutdown"})
