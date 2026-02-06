import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from utils_others.logger import logger
from utils_others.error_handler import register_exception_handlers

from middleware.security_headers import SecurityHeadersMiddleware
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

app.mount("/logos", StaticFiles(directory="logos"), name="logos")

# ---------------------------------------------------------
# Browser Display (Root)
# ---------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
async def root_page():
    return """
    <html>
        <head>
            <title>Skreenit Backend API</title>
            <meta http-equiv="refresh" content="5;url=https://www.skreenit.com" />
        </head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <img src="https://backend.skreenit.com/logos/logobrand.png" alt="Skreenit Logo" style="max-width: 200px;" />
            <h2>Skreenit Backend API</h2>
            <p>Running in <strong>{ENV}</strong> mode.</p>
        </body>
    </html>
    """

# ---------------------------------------------------------
# Logging
# ---------------------------------------------------------
def _mask(v: str | None) -> str | None:
    if not v: return None
    v = str(v)
    return (v[:8] + "...") if len(v) > 12 else "***"

logger.info("Backend Startup", extra={
    "environment": ENV,
    "supabase_url": _mask(os.getenv("SUPABASE_URL")),
})

# ---------------------------------------------------------
# Health Check
# ---------------------------------------------------------
@app.get("/health")
async def health_root():
    return {"status": "healthy", "version": "1.0.0", "environment": ENV}

# ---------------------------------------------------------
# Exception Handlers
# ---------------------------------------------------------
register_exception_handlers(app)

# ---------------------------------------------------------
# API Router
# ---------------------------------------------------------
api = APIRouter(prefix="/api/v1")
api.include_router(auth.router, tags=["Authentication"])
api.include_router(applicant.router, tags=["Applicant"])
api.include_router(recruiter.router, tags=["Recruiter"])
api.include_router(dashboard.router, tags=["Dashboard"])
api.include_router(analytics.router, tags=["Analytics"])
api.include_router(notification.router, tags=["Notification"])
api.include_router(video.router, tags=["Video"])

@api.get("/health")
async def versioned_health():
    return {"status": "healthy", "version": "1.0.0"}

app.include_router(api)

# ---------------------------------------------------------
# MIDDLEWARE SETUP (Order is Critical)
# ---------------------------------------------------------
# In FastAPI, "add_middleware" adds to the OUTSIDE.
# The middleware added LAST runs FIRST.

# 3. Auth Middleware (Runs 3rd)
class PatchedAuthMiddleware(AuthMiddleware): 
    async def dispatch(self, request, call_next):
        # We allow OPTIONS to pass through so CORS middleware can handle it
        if request.method == "OPTIONS":
             return await call_next(request)
        return await super().dispatch(request, call_next)

app.add_middleware(PatchedAuthMiddleware, excluded_paths=EXCLUDED_PATHS)

# 2. Security Headers (Runs 2nd)
app.add_middleware(SecurityHeadersMiddleware)

# 1. CORS Middleware (Runs 1st - CRITICAL)
# Must be added LAST in the code to run FIRST in the pipeline.
DEFAULT_ALLOWED_ORIGINS = [
    "https://www.skreenit.com",
    "https://skreenit.com",
    "https://login.skreenit.com",
    "https://auth.skreenit.com",
    "https://applicant.skreenit.com",
    "https://recruiter.skreenit.com",
    "https://dashboard.skreenit.com",
    "https://backend.skreenit.com",
]

LOCAL_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

origins = DEFAULT_ALLOWED_ORIGINS if IS_PROD else DEFAULT_ALLOWED_ORIGINS + LOCAL_DEV_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

# ---------------------------------------------------------
# Events
# ---------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    logger.info("Backend Started")

@app.on_event("shutdown")
async def on_shutdown():
    logger.info("Backend Stopped")