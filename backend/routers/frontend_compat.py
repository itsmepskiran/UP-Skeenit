from fastapi import APIRouter, Request, UploadFile, File, Form
from typing import Optional

from services.dashboard_service import DashboardService
from services.applicant_service import ApplicantService
from services.video_service import VideoService
from services.supabase_client import get_client
from utils_others.rbac import ensure_permission, ensure_role

router = APIRouter(tags=["FrontendCompat"])

dash_svc = DashboardService()
app_svc = ApplicantService()
video_svc = VideoService()


@router.get("/candidate/dashboard")
async def candidate_dashboard(request: Request):
    ensure_role(request, ["candidate", "admin"])
    ensure_permission(request, "applications:view")
    return dash_svc.get_summary(request.state.user["id"])


@router.get("/recruiter/dashboard")
async def recruiter_dashboard(request: Request):
    ensure_role(request, ["recruiter", "admin"])
    ensure_permission(request, "jobs:view")
    return dash_svc.get_summary(request.state.user["id"])


@router.get("/jobs")
async def list_jobs(request: Request):
    # Candidate job search listing
    ensure_permission(request, "applications:view")
    sb = get_client()
    res = sb.table("jobs").select("*").execute()
    return {"jobs": getattr(res, "data", []) or []}


@router.get("/candidate/applications")
async def candidate_applications(request: Request):
    ensure_role(request, ["candidate", "admin"])
    ensure_permission(request, "applications:view")
    sb = get_client()
    res = (
        sb.table("job_applications")
        .select("*")
        .eq("candidate_id", request.state.user["id"])
        .order("applied_at", desc=True)
        .execute()
    )
    return {"applications": getattr(res, "data", []) or []}


@router.get("/candidate/resume-url")
async def candidate_resume_url(request: Request):
    ensure_role(request, ["candidate", "admin"])
    ensure_permission(request, "applications:view")
    return app_svc.get_resume_url(request.state.user["id"])


@router.post("/candidate/resume")
async def candidate_upload_resume(request: Request, resume: UploadFile = File(...)):
    ensure_role(request, ["candidate", "admin"])
    ensure_permission(request, "profile:update")
    content = await resume.read()
    return app_svc.upload_resume(
        request.state.user["id"],
        resume.filename,
        content,
        resume.content_type,
    )


@router.get("/applications/{application_id}")
async def application_details(request: Request, application_id: str):
    ensure_permission(request, "applications:view")
    sb = get_client()

    app_res = (
        sb.table("job_applications")
        .select("*")
        .eq("id", application_id)
        .single()
        .execute()
    )
    app_row = getattr(app_res, "data", None) or {}

    job_id = app_row.get("job_id")
    job_row = {}
    if job_id:
        job_res = sb.table("jobs").select("*").eq("id", job_id).single().execute()
        job_row = getattr(job_res, "data", None) or {}

    out = dict(app_row)
    out["job"] = job_row
    return out


@router.get("/candidate/questions")
async def candidate_questions(request: Request):
    ensure_role(request, ["candidate", "admin"])
    ensure_permission(request, "video:upload")
    # Optional feature in frontend. If you don't have a questions table yet, return empty.
    return {"questions": []}


@router.post("/video/response")
async def upload_video_response(
    request: Request,
    video: UploadFile = File(...),
    question_id: str = Form(...),
    application_id: Optional[str] = Form(None),
):
    ensure_permission(request, "video:upload")

    content = await video.read()
    url = video_svc.upload_video_to_storage(content, video.filename, request.state.user["id"])

    app_id = application_id or request.state.user["id"]
    row = video_svc.save_video_response(
        application_id=app_id,
        question_id=question_id,
        video_url=url,
        candidate_id=request.state.user["id"],
    )

    return {"ok": True, "data": row, "video_url": url}


@router.post("/video/general")
async def upload_general_video(
    request: Request,
    video: UploadFile = File(...),
    candidate_id: Optional[str] = Form(None),
):
    ensure_permission(request, "video:upload")
    content = await video.read()
    url = video_svc.upload_video_to_storage(content, video.filename, request.state.user["id"])
    row = video_svc.save_general_video(candidate_id=request.state.user["id"], video_url=url)
    return {"ok": True, "data": row, "video_url": url}
