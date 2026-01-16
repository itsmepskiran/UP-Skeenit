from fastapi import APIRouter, Request
from models.recruiter_models import (
    JobCreateRequest,
    JobUpdateRequest,
    RecruiterProfileUpdate,
)
from services.recruiter_service import RecruiterService
from utils_others.rbac import ensure_role, ensure_permission

router = APIRouter(prefix="/recruiter", tags=["Recruiter"])
svc = RecruiterService()


# ---------------------------------------------------------
# CREATE JOB (Recruiter or Admin)
# ---------------------------------------------------------
@router.post("/jobs")
async def create_job(request: Request, payload: JobCreateRequest):
    ensure_permission(request, "jobs:create")
    return svc.create_job(request.state.user["id"], payload.model_dump())


# ---------------------------------------------------------
# UPDATE JOB
# ---------------------------------------------------------
@router.put("/jobs/{job_id}")
async def update_job(request: Request, job_id: str, payload: JobUpdateRequest):
    ensure_permission(request, "jobs:update")
    return svc.update_job(job_id, request.state.user["id"], payload.model_dump())


# ---------------------------------------------------------
# DELETE JOB
# ---------------------------------------------------------
@router.delete("/jobs/{job_id}")
async def delete_job(request: Request, job_id: str):
    ensure_permission(request, "jobs:delete")
    return svc.delete_job(job_id, request.state.user["id"])


# ---------------------------------------------------------
# LIST JOBS FOR RECRUITER
# ---------------------------------------------------------
@router.get("/jobs")
async def list_jobs(request: Request):
    ensure_permission(request, "jobs:view")
    return svc.list_jobs(request.state.user["id"])


# ---------------------------------------------------------
# GET APPLICATIONS FOR A JOB
# ---------------------------------------------------------
@router.get("/jobs/{job_id}/applications")
async def list_applications(request: Request, job_id: str):
    ensure_permission(request, "applications:view")
    return svc.list_applications(job_id, request.state.user["id"])


# ---------------------------------------------------------
# GET CANDIDATE DETAILS
# ---------------------------------------------------------
@router.get("/applications/{application_id}/candidate")
async def get_candidate_details(request: Request, application_id: str):
    ensure_permission(request, "applications:view")
    return svc.get_candidate_details(application_id, request.state.user["id"])


# ---------------------------------------------------------
# UPDATE RECRUITER PROFILE
# ---------------------------------------------------------
@router.put("/profile")
async def update_profile(request: Request, payload: RecruiterProfileUpdate):
    ensure_permission(request, "profile:update")
    return svc.update_profile(request.state.user["id"], payload.model_dump())
