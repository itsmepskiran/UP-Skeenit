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
# CREATE JOB
# ---------------------------------------------------------
@router.post("/jobs")
async def create_job(request: Request, payload: JobCreateRequest):
    ensure_permission(request, "jobs:create")
    user = request.state.user

    data = payload.model_dump()
    data["created_by"] = user["id"]

    try:
        job = svc.post_job(data)
        return {"ok": True, "data": job}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# UPDATE JOB
# ---------------------------------------------------------
@router.put("/jobs/{job_id}")
async def update_job(request: Request, job_id: str, payload: JobUpdateRequest):
    ensure_permission(request, "jobs:update")
    user = request.state.user

    try:
        updated = svc.update_job(job_id, payload.model_dump(), user["id"])
        return {"ok": True, "data": updated}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# DELETE JOB
# ---------------------------------------------------------
@router.delete("/jobs/{job_id}")
async def delete_job(request: Request, job_id: str):
    ensure_permission(request, "jobs:delete")
    user = request.state.user

    try:
        deleted = svc.delete_job(job_id, user["id"])
        return {"ok": True, "data": deleted}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# RECRUITER DASHBOARD
# ---------------------------------------------------------
@router.get("/dashboard")
async def recruiter_dashboard(request: Request):
    ensure_permission(request, "dashboard:view")
    ensure_role(request, ["recruiter", "admin"])

    user = request.state.user
    summary = dash_svc.get_summary(user["id"])
    return {"ok": True, "data": summary}


# ---------------------------------------------------------
# LIST CANDIDATES
# ---------------------------------------------------------
@router.get("/candidates")
async def list_candidates(request: Request):
    ensure_permission(request, "applications:view")

    try:
        res = (
            svc.supabase.table("candidate_profiles")
            .select("user_id, full_name, email, current_role")
            .execute()
        )
        rows = getattr(res, "data", []) or []

        candidates = [
            {
                "id": row.get("user_id"),
                "full_name": row.get("full_name"),
                "email": row.get("email"),
                "current_role": row.get("current_role"),
            }
            for row in rows
        ]

        return {"ok": True, "data": candidates}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# ANALYTICS
# ---------------------------------------------------------
@router.get("/analytics")
async def recruiter_analytics(request: Request):
    ensure_permission(request, "analytics:view")
    ensure_role(request, ["recruiter", "admin"])

    user = request.state.user
    events = analytics_svc.list_events(user["id"])
    return {"ok": True, "data": events}


# ---------------------------------------------------------
# CANDIDATE DETAILS
# ---------------------------------------------------------
@router.get("/candidate-details")
async def candidate_details(request: Request, candidate_id: str, job_id: str | None = None):
    ensure_permission(request, "applications:view")

    try:
        details = svc.get_candidate_details(candidate_id, job_id)
        return {"ok": True, "data": details}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# APPROVE APPLICATION
# ---------------------------------------------------------
@router.post("/application/{application_id}/approve")
async def approve_application(request: Request, application_id: str):
    ensure_permission(request, "applications:update")

    try:
        res = (
            svc.supabase.table("job_applications")
            .update({"status": "under_review"})
            .eq("id", application_id)
            .execute()
        )

        if getattr(res, "error", None):
            raise RuntimeError(res.error)

        return {"ok": True}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# LIST JOBS FOR RECRUITER
# ---------------------------------------------------------
@router.get("/jobs")
async def list_jobs(request: Request, page: int = 1, page_size: int = 20):
    ensure_permission(request, "jobs:view")
    user = request.state.user

    try:
        jobs = svc.list_jobs(user["id"], page=page, page_size=page_size)
        return {"ok": True, "data": jobs}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# GET SINGLE JOB
# ---------------------------------------------------------
@router.get("/jobs/{job_id}")
async def get_job(request: Request, job_id: str):
    ensure_permission(request, "jobs:view")

    try:
        job = svc.get_job(job_id)
        return {"ok": True, "data": job}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


# ---------------------------------------------------------
# GET APPLICATIONS FOR A JOB
# ---------------------------------------------------------
@router.get("/jobs/{job_id}/applications")
async def list_applications(request: Request, job_id: str):
    ensure_permission(request, "applications:view")

    try:
        res = (
            svc.supabase.table("job_applications")
            .select("*")
            .eq("job_id", job_id)
            .order("applied_at", desc=True)
            .execute()
        )
        return {"ok": True, "data": getattr(res, "data", []) or []}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# GET CANDIDATE DETAILS FROM APPLICATION ID
# ---------------------------------------------------------
@router.get("/applications/{application_id}/candidate")
async def get_candidate_details(request: Request, application_id: str):
    ensure_permission(request, "applications:view")

    try:
        res = (
            svc.supabase.table("job_applications")
            .select("candidate_id, job_id")
            .eq("id", application_id)
            .single()
            .execute()
        )

        data = getattr(res, "data", None) or {}
        candidate_id = data.get("candidate_id")
        job_id = data.get("job_id")

        if not candidate_id:
            raise HTTPException(status_code=404, detail="Candidate not found")

        details = svc.get_candidate_details(candidate_id, job_id)
        return {"ok": True, "data": details}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# UPDATE RECRUITER PROFILE
# ---------------------------------------------------------
@router.put("/profile")
async def update_profile(request: Request, payload: RecruiterProfileUpdate):
    ensure_permission(request, "profile:update")
    user = request.state.user

    data = payload.model_dump()
    data["user_id"] = user["id"]

    try:
        profile = svc.upsert_profile(data)
        
        # Update onboarded status to True
        svc.supabase.auth.update_user({
            "id": user["id"],
            "data": {"onboarded": True}
        })
        
        return {"ok": True, "data": profile}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
