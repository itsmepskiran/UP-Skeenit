from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Depends
from typing import Optional, List
import json
from services.auth_service import get_current_user
from services.applicant_service import ApplicantService
from services.recruiter_service import RecruiterService
from services.video_service import VideoService
from services.supabase_client import get_client
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
        return apps # Return list directly for cleaner JS handling
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
# 1. GET INTERVIEW QUESTIONS / SETUP
# ---------------------------------------------------------
@router.get("/applications/{application_id}/interview")
async def get_interview_setup(request: Request, application_id: str):
    ensure_permission(request, "applications:view")
    current_user = request.state.user

    try:
        # Fetch directly from Supabase to ensure clean data access
        # Using dependency injection here for DB client would be cleaner, but
        # keeping consistency with your existing style:
        db = get_client() 
        res = db.table("job_applications").select("*").eq("id", application_id).single().execute()
        app = res.data

        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Security: Ensure this candidate owns this application
        if app.get("candidate_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Unauthorized access to this interview")
        
        # Fetch the questions related to the job
        # Assuming questions are stored in jobs table or a joined query
        # For now, returning the status which is crucial for the frontend flow
        return {
            "ok": True,
            "status": app.get("status"),
            "job_id": app.get("job_id")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# 2. SAVE VIDEO RESPONSE
# ---------------------------------------------------------
@router.post("/applications/{application_id}/response")
async def save_interview_response(request: Request, application_id: str, payload: dict):
    ensure_permission(request, "video:upload")
    current_user = request.state.user

    try:
        # Extract variables safely
        q_text = payload.get("question") 
        v_path = payload.get("video_path")

        # Call Service
        saved_row = vd_svc.save_video_response(
            application_id=application_id,
            question=q_text,      
            video_url=v_path,
            candidate_id=current_user["id"],
            status="completed"
        )

        return {
            "ok": True, 
            "message": "Response saved successfully",
            "data": {
                "question": q_text,
                "video_url": v_path,
                "db_id": saved_row.get("id") if saved_row else None
            }
        }

    except Exception as e:
        print(f"Save Response Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# 3. GET INTERVIEW RESPONSES (Review Feature)
# ---------------------------------------------------------
@router.get("/applications/{application_id}/responses")
async def get_interview_responses(
    request: Request, 
    application_id: str,
    db = Depends(get_client) # Use Depends for cleaner DB access
):
    """
    Get all video responses for a specific application.
    Used for the 'Review My Responses' modal.
    """
    ensure_permission(request, "applications:view")
    current_user = request.state.user

    try:
        # Securely fetch only the candidate's own responses
        # We explicitly check candidate_id match here
        query = db.table("video_responses") \
            .select("question, video_url, recorded_at") \
            .eq("application_id", application_id) \
            .eq("candidate_id", current_user["id"]) \
            .order("recorded_at") \
            .execute()

        # Format matches what frontend expects: {"responses": [...]}
        return {"responses": query.data}

    except Exception as e:
        print(f"Error getting interview responses: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to retrieve interview responses"
        )

# ---------------------------------------------------------
# 4. FINISH INTERVIEW
# ---------------------------------------------------------
@router.post("/applications/{application_id}/finish-interview")
async def finish_interview(
    application_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_client)
):
    try:
        # 1. Fetch from job_applications
        res = db.table("job_applications").select("*").eq("id", application_id).single().execute()
        application = res.data

        if not application:
            raise HTTPException(status_code=404, detail="Application not found")

        # 2. Security Check (candidate_id must match)
        if application.get('candidate_id') != current_user.get('id'):
            raise HTTPException(status_code=403, detail="Not authorized")

        # 3. Update status
        db.table("job_applications").update({"status": "interview_submitted"}).eq("id", application_id).execute()

        return {"ok": True, "message": "Interview completed", "status": "interview_submitted"}

    except Exception as e:
        print(f"Finish Interview Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))