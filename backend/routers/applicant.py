from fastapi import APIRouter, Request, UploadFile, File, HTTPException
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

    try:
        svc.save_draft(request.state.user["id"], payload.draft)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# GET DRAFT
# ---------------------------------------------------------
@router.get("/draft")
async def get_draft(request: Request):
    ensure_permission(request, "applications:view")

    try:
        draft = svc.get_draft(request.state.user["id"])
        return {"ok": True, "data": draft}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# SAVE DETAILED FORM
# ---------------------------------------------------------
@router.post("/detailed-form")
async def save_detailed_form(request: Request, payload: DetailedFormRequest):
    ensure_permission(request, "profile:update")

    try:
        svc.save_detailed_form(
            request.state.user["id"],
            profile=payload.profile,
            education=payload.education,
            experience=payload.experience,
            skills=payload.skills,
        )
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# GET DETAILED FORM
# ---------------------------------------------------------
@router.get("/detailed-form")
async def get_detailed_form(request: Request):
    ensure_permission(request, "applications:view")

    try:
        details = svc.get_detailed_form(request.state.user["id"])
        return {"ok": True, "data": details}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# UPLOAD RESUME
# ---------------------------------------------------------
@router.post("/resume")
async def upload_resume(request: Request, file: UploadFile = File(...)):
    ensure_permission(request, "profile:update")

    try:
        content = await file.read()
        result = svc.upload_resume(
            request.state.user["id"],
            file.filename,
            content,
            file.content_type,
        )
        return {"ok": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# GET RESUME URL
# ---------------------------------------------------------
@router.get("/resume")
async def get_resume(request: Request):
    ensure_permission(request, "applications:view")

    try:
        url = svc.get_resume_url(request.state.user["id"])
        return {"ok": True, "data": url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
