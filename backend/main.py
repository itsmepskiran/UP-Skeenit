import os
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, applicant, recruiter, dashboard, analytics, notification, video

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


# ---------------------------------------------------------
# Security Middleware
# ---------------------------------------------------------
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=200, window=900)
app.add_middleware(AuthMiddleware)


# ---------------------------------------------------------
# Health Check
# ---------------------------------------------------------
@app.get("/health")
async def health_check():
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

app.include_router(api_router)
