from fastapi import APIRouter, Request, UploadFile, File
from models.applicant_models import (
    DraftSaveRequest,
    DetailedFormRequest,
)
from services.applicant_service import ApplicantService
from utils_others.rbac import ensure_permission

router = APIRouter(prefix="/applicant", tags=["Applicant"])
svc = ApplicantService()


# ---------------------------------------------------------
# SAVE DRAFT
# ---------------------------------------------------------
@router.post("/draft")
async def save_draft(request: Request, payload: DraftSaveRequest):
    ensure_permission(request, "applications:create")
    svc.save_draft(request.state.user["id"], payload.draft)
    return {"ok": True}


# ---------------------------------------------------------
# GET DRAFT
# ---------------------------------------------------------
@router.get("/draft")
async def get_draft(request: Request):
    ensure_permission(request, "applications:view")
    return svc.get_draft(request.state.user["id"])


# ---------------------------------------------------------
# SAVE DETAILED FORM
# ---------------------------------------------------------
@router.post("/detailed-form")
async def save_detailed_form(request: Request, payload: DetailedFormRequest):
    ensure_permission(request, "profile:update")
    svc.save_detailed_form(
        request.state.user["id"],
        profile=payload.profile,
        education=payload.education,
        experience=payload.experience,
        skills=payload.skills,
    )
    return {"ok": True}


# ---------------------------------------------------------
# GET DETAILED FORM
# ---------------------------------------------------------
@router.get("/detailed-form")
async def get_detailed_form(request: Request):
    ensure_permission(request, "applications:view")
    return svc.get_detailed_form(request.state.user["id"])


# ---------------------------------------------------------
# UPLOAD RESUME
# ---------------------------------------------------------
@router.post("/resume")
async def upload_resume(request: Request, file: UploadFile = File(...)):
    ensure_permission(request, "profile:update")
    content = await file.read()
    return svc.upload_resume(
        request.state.user["id"],
        file.filename,
        content,
        file.content_type,
    )


# ---------------------------------------------------------
# GET RESUME URL
# ---------------------------------------------------------
@router.get("/resume")
async def get_resume(request: Request):
    ensure_permission(request, "applications:view")
    return svc.get_resume_url(request.state.user["id"])
