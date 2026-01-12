import logging
import os
from fastapi import APIRouter, Request, HTTPException, Form, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from models.auth_models import LoginRequest
from services.auth_service import AuthService
from services.supabase_client import get_client
from typing import Optional

# Lazily initialize the client and AuthService on first request
load_dotenv()

router = APIRouter(tags=["auth"])
_auth_service: Optional[AuthService] = None

def get_auth_service() -> AuthService:
    global _auth_service
    if _auth_service is None:
        try:
            supabase = get_client()
        except Exception as e:
            raise RuntimeError("Supabase client not configured: " + str(e)) from e
        _auth_service = AuthService(supabase)
    return _auth_service

@router.post("/register")
async def register(
    full_name: str = Form(...),
    email: str = Form(...),
    mobile: str = Form(...),
    location: str = Form(...),
    role: str = Form(...),
    company_id: str = Form(None),
    company_name: str = Form(None),
    resume: UploadFile = File(None)
):
    """Register a new user with role-specific handling"""
    try:
        if role not in ['candidate', 'recruiter']:
            raise HTTPException(status_code=400, detail="Invalid role specified")
        
        if role == 'recruiter' and not company_name:
            raise HTTPException(status_code=400, detail="Company name is required for recruiter registration")
            
        resume_bytes = None
        resume_filename = None
        if resume and role == 'candidate':
            allowed_types = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
            if resume.content_type not in allowed_types:
                raise HTTPException(status_code=400, detail="Invalid resume format. Please upload PDF or DOC/DOCX file")
            
            resume_bytes = await resume.read()
            resume_filename = resume.filename

        try:
            service = get_auth_service()
            result = service.register(
                full_name=full_name,
                email=email,
                mobile=mobile,
                location=location,
                role=role,
                company_id=company_id,
                company_name=company_name,
                resume_bytes=resume_bytes,
                resume_filename=resume_filename
            )
            return {
                "ok": True,
                "message": "Registration successful! Please check your email to verify your account."
            }

        except Exception as e:
            error_msg = str(e).lower()
            if "already exists" in error_msg or "already registered" in error_msg:
                raise HTTPException(status_code=400, detail="This email is already registered")
            raise

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/update-password")
async def update_password(
    request: Request,
    new_password: str = Form(...)
):
    """Update user password using the session from the Authorization header"""
    try:
        # Extract Bearer token from header
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
        
        token = auth_header.split(" ", 1)[1]
        
        try:
            service = get_auth_service()
            
            # Validate the token to ensure we have a real user session
            user_info = service.validate_token(token)
            user = user_info.get("user")
            
            if not user or not user.get("id"):
                raise HTTPException(status_code=401, detail="Invalid or expired session")
            
            user_id = user["id"]
            user_email = user.get("email")
            
            # 1. Update password via Admin API (sure-fire way)
            service.supabase.auth.admin.update_user_by_id(
                user_id=user_id,
                attributes={"password": new_password}
            )
            
            # 2. Update metadata to mark user as onboarded
            service.supabase.auth.admin.update_user_by_id(
                user_id=user_id,
                attributes={
                    "user_metadata": {
                        **user.get("user_metadata", {}),
                        "password_set": True,
                        "onboarded": True
                    }
                }
            )
            
            # 3. Send notification email
            if user_email:
                try:
                    full_name = user.get("user_metadata", {}).get("full_name")
                    service.notify_password_changed(email=user_email, full_name=full_name)
                except Exception as e:
                    logging.error(f"Failed to send password notification: {e}")

            return {
                "ok": True,
                "message": "Password updated successfully"
            }
            
        except Exception as e:
            logging.error(f"Password update failed: {str(e)}")
            # Return generic error unless it's an HTTPException
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=400, detail="Failed to update password")
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in update_password: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/login")
async def login(request: LoginRequest):
    try:
        try:
            service = get_auth_service()
        except RuntimeError as re:
            return JSONResponse(status_code=500, content={"ok": False, "error": str(re)})

        result = service.login(request.email, request.password)
        return result
    except Exception as e:
        return JSONResponse(status_code=401, content={"ok": False, "error": str(e)})

@router.post("/password-updated")
async def password_updated(request: Request):
    try:
        auth_header: Optional[str] = request.headers.get("authorization")
        if not auth_header or not auth_header.lower().startswith("bearer "):
            return JSONResponse(status_code=401, content={"ok": False, "error": "Missing Authorization header"})
        token = auth_header.split(" ", 1)[1]
        try:
            service = get_auth_service()
        except RuntimeError as re:
            return JSONResponse(status_code=500, content={"ok": False, "error": str(re)})

        user_info = service.validate_token(token)
        user = user_info.get("user") or {}
        email = user.get("email")
        metadata = user.get("user_metadata") or {}
        role = metadata.get("role")
        full_name = metadata.get("full_name") or None

        try:
            _ = service.notify_password_changed(email=email, full_name=full_name)
        except Exception as e:
            logging.error(f"Failed to send password changed notification: {str(e)}")

        if role == "recruiter":
            try:
                company = service.get_recruiter_company_info(user.get("id"))
                cid = company.get("company_id")
                cname = company.get("company_name")
                if cid:
                    _ = service.send_recruiter_company_email(email=email, full_name=full_name, company_id=cid, company_name=cname)
            except Exception as e:
                logging.error(f"Failed to process recruiter company info: {str(e)}")

        return {"ok": True, "data": {"user": user, "message": "Password updated successfully. Please log in."}}
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})

@router.post("/forgot-password")
async def forgot_password(email: str = Form(...)):
    """Send password reset email"""
    try:
        service = get_auth_service()
        site_url = os.getenv("FRONTEND_BASE_URL", "https://login.skreenit.com")
        redirect_to = f"{site_url}/update-password.html"
        
        # Send password reset email with redirect URL
        service.supabase.auth.reset_password_email(
            email,
            {
                "redirect_to": redirect_to
            }
        )
        
        return {
            "ok": True,
            "message": "Password reset email sent. Please check your email."
        }
        
    except Exception as e:
        error_msg = str(e).lower()
        if "user not found" in error_msg:
            # Don't reveal that the email doesn't exist
            return {"ok": True, "message": "If an account exists with this email, a password reset link has been sent."}
        logging.error(f"Password reset error: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to send password reset email")

@router.get("/confirm-email")
async def confirm_email(request: Request, token: str, type: str, redirect_to: str = None):
    """Handle email confirmation and redirect to update password page"""
    try:
        service = get_auth_service()
        
        # Verify the email confirmation token
        auth_resp = service.supabase.auth.verify_otp({
            "token": token,
            "type": type,
            "email": None,
        })
        
        if not auth_resp or not getattr(auth_resp, "user", None):
            raise HTTPException(status_code=400, detail="Invalid or expired confirmation link")
        
        # If we have a redirect URL, use it
        if redirect_to:
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=redirect_to)
        
        return {"ok": True, "message": "Email confirmed successfully"}
        
    except Exception as e:
        logging.error(f"Email confirmation error: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to confirm email")