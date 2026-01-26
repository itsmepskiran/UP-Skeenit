from fastapi import APIRouter, Request, UploadFile, File
from services.video_service import VideoService
from utils_others.rbac import ensure_permission

router = APIRouter(prefix="/video", tags=["Video"])
svc = VideoService()


# ---------------------------------------------------------
# UPLOAD VIDEO (Candidate)
# ---------------------------------------------------------
@router.post("/upload")
async def upload_video(request: Request, file: UploadFile = File(...)):
    ensure_permission(request, "video:upload")
    content = await file.read()
    url = svc.upload_video_to_storage(content, file.filename, request.state.user["id"])
    return {"video_url": url}


# ---------------------------------------------------------
# UPLOAD GENERAL VIDEO (Candidate) — frontend expects /video/general
# ---------------------------------------------------------
@router.post("/general")
async def upload_general_video(request: Request, video: UploadFile = File(...)):
    ensure_permission(request, "video:upload")
    content = await video.read()
    url = svc.upload_video_to_storage(content, video.filename, request.state.user["id"])
    return {"video_url": url}


# ---------------------------------------------------------
# SAVE VIDEO RESPONSE
# ---------------------------------------------------------
@router.post("/response")
async def save_video_response(request: Request, payload: dict):
    ensure_permission(request, "video:upload")
    return svc.save_video_response(**payload, candidate_id=request.state.user["id"])


# ---------------------------------------------------------
# GET VIDEO RESPONSES (Recruiter/Admin)
# ---------------------------------------------------------
@router.get("/application/{application_id}")
async def get_video_responses(request: Request, application_id: str):
    ensure_permission(request, "applications:view")
    return svc.list_video_responses(application_id)
