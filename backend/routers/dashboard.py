from fastapi import APIRouter, Depends, HTTPException, Header
from supabase import create_client, Client
import os
from typing import Optional
from models.dashboard_models import DashboardSummary
from utils_others.security import get_user_from_bearer

router = APIRouter(tags=["dashboard"])

def get_supabase_client() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise RuntimeError("Supabase credentials are not set")
    return create_client(supabase_url, supabase_key)

def require_user(authorization: str = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.replace("Bearer ", "")
    try:
        user = get_user_from_bearer(token)
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@router.get("/summary/{user_id}")
def get_dashboard_summary(
    user_id: str,
    client: Client = Depends(get_supabase_client),
    user: dict = Depends(require_user)
):
    # Fetch user role from Supabase Auth
    auth_user = client.auth.admin.get_user_by_id(user_id)
    if not auth_user or not getattr(auth_user, "user", None):
        raise HTTPException(status_code=404, detail="User not found")

    metadata = auth_user.user.user_metadata or {}
    role = metadata.get("role")

    if not role:
        raise HTTPException(status_code=400, detail="User role missing")

    summary = {"role": role, "jobs": [], "applications": []}

    # Recruiter dashboard
    if role == "recruiter":
        jobs_resp = (
            client.table("jobs")
            .select("id, title, status, created_at")
            .eq("created_by", user_id)
            .execute()
        )
        jobs = jobs_resp.data or []
        summary["jobs"] = jobs

        job_ids = [job["id"] for job in jobs]
        if job_ids:
            applications_resp = (
                client.table("job_applications")
                .select("id, status, ai_score, candidate_id, applied_at, job_id")
                .in_("job_id", job_ids)
                .execute()
            )
            summary["applications"] = applications_resp.data or []

    # Candidate dashboard
    elif role == "candidate":
        applications_resp = (
            client.table("job_applications")
            .select("id, status, ai_score, applied_at, job_id")
            .eq("candidate_id", user_id)
            .execute()
        )
        applications = applications_resp.data or []
        summary["applications"] = applications

        job_ids = [app["job_id"] for app in applications]
        if job_ids:
            jobs_resp = (
                client.table("jobs")
                .select("id, title, company, location, job_type, status")
                .in_("id", job_ids)
                .execute()
            )
            summary["jobs"] = jobs_resp.data or []

    else:
        raise HTTPException(status_code=400, detail="Unknown user role")

    return DashboardSummary(**summary)
