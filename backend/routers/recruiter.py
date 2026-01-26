from fastapi import APIRouter, Request, HTTPException
from models.recruiter_models import (
    JobCreateRequest,
    JobUpdateRequest,
    RecruiterProfileUpdate,
)
from services.recruiter_service import RecruiterService
from services.dashboard_service import DashboardService
from services.analytics_service import AnalyticsService
from utils_others.rbac import ensure_role, ensure_permission

router = APIRouter(prefix="/recruiter", tags=["Recruiter"])
svc = RecruiterService()
dash_svc = DashboardService()
analytics_svc = AnalyticsService()


# ---------------------------------------------------------
# CREATE JOB (Recruiter or Admin)
# ---------------------------------------------------------
@router.post("/jobs")
async def create_job(request: Request, payload: JobCreateRequest):
    ensure_permission(request, "jobs:create")
    data = payload.model_dump()
    data["created_by"] = request.state.user["id"]
    return svc.post_job(data)


# ---------------------------------------------------------
# UPDATE JOB
# ---------------------------------------------------------
@router.put("/jobs/{job_id}")
async def update_job(request: Request, job_id: str, payload: JobUpdateRequest):
    ensure_permission(request, "jobs:update")
    return svc.update_job(job_id, payload.model_dump(), request.state.user["id"])


# ---------------------------------------------------------
# DELETE JOB
# ---------------------------------------------------------
@router.delete("/jobs/{job_id}")
async def delete_job(request: Request, job_id: str):
    ensure_permission(request, "jobs:delete")
    return svc.delete_job(job_id, request.state.user["id"])


# ---------------------------------------------------------
# RECRUITER DASHBOARD (Frontend expects /recruiter/dashboard)
# ---------------------------------------------------------
@router.get("/dashboard")
async def recruiter_dashboard(request: Request):
    ensure_permission(request, "dashboard:view")
    user = request.state.user
    ensure_role(request, ["recruiter", "admin"])
    return dash_svc.get_summary(user["id"])


# ---------------------------------------------------------
# LIST CANDIDATES (Frontend expects /recruiter/candidates)
# ---------------------------------------------------------
@router.get("/candidates")
async def list_candidates(request: Request):
    ensure_permission(request, "applications:view")
    # Minimal list: pull from candidate_profiles (adjust table name if yours differs)
    res = svc.supabase.table("candidate_profiles").select("user_id,full_name,email,current_role").execute()
    data = getattr(res, "data", []) or []
    candidates = [
        {
            "id": row.get("user_id") or row.get("id"),
            "full_name": row.get("full_name"),
            "email": row.get("email"),
            "current_role": row.get("current_role"),
        }
        for row in data
    ]
    return {"candidates": candidates}


# ---------------------------------------------------------
# ANALYTICS (Frontend expects /recruiter/analytics)
# ---------------------------------------------------------
@router.get("/analytics")
async def recruiter_analytics(request: Request):
    ensure_permission(request, "analytics:view")
    user = request.state.user
    ensure_role(request, ["recruiter", "admin"])
    return analytics_svc.list_events(user["id"])


# ---------------------------------------------------------
# CANDIDATE DETAILS (Frontend expects /recruiter/candidate-details?candidate_id=&job_id=)
# ---------------------------------------------------------
@router.get("/candidate-details")
async def candidate_details(request: Request, candidate_id: str, job_id: str | None = None):
    ensure_permission(request, "applications:view")
    return svc.get_candidate_details(candidate_id, job_id)


# ---------------------------------------------------------
# APPROVE APPLICATION (Frontend expects /recruiter/application/{application_id}/approve)
# ---------------------------------------------------------
@router.post("/application/{application_id}/approve")
async def approve_application(request: Request, application_id: str):
    ensure_permission(request, "applications:update")
    # Minimal implementation: update job_applications.status
    try:
        res = (
            svc.supabase.table("job_applications")
            .update({"status": "under_review"})
            .eq("id", application_id)
            .execute()
        )
        if getattr(res, "error", None):
            raise RuntimeError(str(res.error))
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# LIST JOBS FOR RECRUITER
# ---------------------------------------------------------
@router.get("/jobs")
async def list_jobs(request: Request):
    ensure_permission(request, "jobs:view")
    return svc.list_jobs(request.state.user["id"])


# ---------------------------------------------------------
# GET SINGLE JOB (Frontend expects /recruiter/jobs/{job_id})
# ---------------------------------------------------------
@router.get("/jobs/{job_id}")
async def get_job(request: Request, job_id: str):
    ensure_permission(request, "jobs:view")
    return svc.get_job(job_id)


# ---------------------------------------------------------
# GET APPLICATIONS FOR A JOB
# ---------------------------------------------------------
@router.get("/jobs/{job_id}/applications")
async def list_applications(request: Request, job_id: str):
    ensure_permission(request, "applications:view")
    res = (
        svc.supabase.table("job_applications")
        .select("*")
        .eq("job_id", job_id)
        .order("applied_at", desc=True)
        .execute()
    )
    return {"applications": getattr(res, "data", []) or []}


# ---------------------------------------------------------
# GET CANDIDATE DETAILS
# ---------------------------------------------------------
@router.get("/applications/{application_id}/candidate")
async def get_candidate_details(request: Request, application_id: str):
    ensure_permission(request, "applications:view")
    # The frontend uses /recruiter/candidate-details for details; keep this endpoint minimal.
    res = (
        svc.supabase.table("job_applications")
        .select("candidate_id,job_id")
        .eq("id", application_id)
        .single()
        .execute()
    )
    data = getattr(res, "data", None) or {}
    candidate_id = data.get("candidate_id")
    job_id = data.get("job_id")
    if not candidate_id:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return svc.get_candidate_details(candidate_id, job_id)


# ---------------------------------------------------------
# UPDATE RECRUITER PROFILE
# ---------------------------------------------------------
@router.put("/profile")
async def update_profile(request: Request, payload: RecruiterProfileUpdate):
    ensure_permission(request, "profile:update")
    data = payload.model_dump()
    data["user_id"] = request.state.user["id"]
    return svc.upsert_profile(data)
