from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from typing import Optional
import json
from services.applicant_service import ApplicantService
from services.recruiter_service import RecruiterService
from services.video_service import VideoService
from middleware.role_required import ensure_permission
from models.applicant_models import ApplicationCreate

router = APIRouter(prefix="/applicant", tags=["Applicant"])
app_svc = ApplicantService()
rec_svc = RecruiterService()
vd_svc = VideoService()

# ---------------------------------------------------------
# CHECK APPLICATION STATUS
# ---------------------------------------------------------
@router.get("/check-status")
async def check_status(request: Request, job_id: str):
    ensure_permission(request, "applications:create") # Candidate role
    user = request.state.user
    
    try:
        status = app_svc.check_application_status(user["id"], job_id)
        return {"ok": True, "applied": status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ---------------------------------------------------------
# APPLY FOR JOB
# ---------------------------------------------------------
@router.post("/apply")
async def apply_for_job(request: Request, payload: ApplicationCreate):
    ensure_permission(request, "applications:create")
    user = request.state.user
    
    try:
        # Prepare Data
        data = payload.model_dump()
        data["candidate_id"] = user["id"]
        result = app_svc.submit_application(data)
        return {"ok": True, "data": result}
    except Exception as e:
        print(f"Application Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile")
async def get_profile(request: Request):
    ensure_permission(request, "profile:view")
    try:
        profile = app_svc.get_profile(request.state.user["id"])
        return {"ok": True, "data": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def update_profile(
    request: Request, 
    full_name: str = Form(...),
    phone: str = Form(None),
    location: str = Form(None),
    summary: str = Form(None),
    linkedin_url: str = Form(None),
    portfolio_url: str = Form(None),
    skills: str = Form("[]"),      # JSON String
    experience: str = Form("[]"),  # JSON String
    education: str = Form("[]"),   # JSON String
    resume: Optional[UploadFile] = File(None)
):
    ensure_permission(request, "profile:edit")
    user = request.state.user
    
    try:
        # Parse JSON strings
        skills_list = json.loads(skills) if skills else []
        exp_list = json.loads(experience) if experience else []
        edu_list = json.loads(education) if education else []
        
        # Prepare Profile Data
        # Note: We do NOT send 'contact_email' as it is not in the schema.
        # 'summary' maps to 'bio' in the database.
        profile_data = {
            "full_name": full_name,
            "phone": phone,
            "location": location,
            "bio": summary, 
            "linkedin_url": linkedin_url,
            "portfolio_url": portfolio_url
        }

        # Handle File
        file_bytes = await resume.read() if resume else None
        filename = resume.filename if resume else None

        # Call Service
        app_svc.update_profile(
            candidate_id=user["id"],
            profile_data=profile_data,
            education=edu_list,
            experience=exp_list,
            skills=skills_list,
            resume_file=file_bytes,
            resume_filename=filename
        )

        return {"ok": True, "message": "Profile updated successfully"}
        
    except Exception as e:
        print(f"Profile Update Error: {e}")
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

# ---------------------------------------------------------
# LIST MY APPLICATIONS
# ---------------------------------------------------------
@router.get("/applications")
async def list_my_applications(request: Request):
    ensure_permission(request, "applications:view")
    try:
        apps = app_svc.get_candidate_applications(request.state.user["id"])
        return {"ok": True, "data": apps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# GET APPLICATION DETAILS
# ---------------------------------------------------------
@router.get("/applications/{application_id}")
async def get_application_details(request: Request, application_id: str):
    ensure_permission(request, "applications:view")
    try:
        app = app_svc.get_application_details(application_id)
        return {"ok": True, "data": app}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# 1. GET INTERVIEW QUESTIONS
# ---------------------------------------------------------
@router.get("/applications/{application_id}/interview")
async def get_interview_setup(request: Request, application_id: str):
    ensure_permission(request, "applications:view")
    current_user = request.state.user

    # Get the application to find the questions
    app = rec_svc.get_application_by_id(application_id)
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    # Security: Ensure this candidate owns this application
    if app["candidate_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Unauthorized access to this interview")

    return {
        "ok": True,
        "interview_questions": app.get("interview_questions", []),
        "status": app.get("status")
    }

# ---------------------------------------------------------
# 2. SAVE VIDEO RESPONSE
# ---------------------------------------------------------
@router.post("/applications/{application_id}/response")
async def save_interview_response(request: Request, application_id: str, payload: dict):
    ensure_permission(request, "video:upload") # OR "applications:create"
    current_user = request.state.user

    try:
        # Save metadata to video_responses table
        saved_row = vd_svc.save_video_response(
            application_id=application_id,
            question_id=payload.get("question"), # Storing Question Text
            video_url=payload.get("video_path"), # Path from frontend upload
            candidate_id=current_user["id"],
            status="completed"
        )
        return {"ok": True, "data": saved_row}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))