import os
from fastapi import APIRouter, Request, HTTPException, Form
from fastapi.responses import RedirectResponse
from typing import Optional

from models.auth_models import LoginRequest
from services.auth_service import AuthService
from services.supabase_client import get_client
from utils_others.logger import logger

router = APIRouter(tags=["Authentication"])
_auth_service: Optional[AuthService] = None

def get_auth_service() -> AuthService:
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService(get_client())
    return _auth_service

@router.post("/login")
async def login(request: Request):
    user = getattr(request.state, "user", None)
    if not user: raise HTTPException(status_code=401, detail="Invalid or missing token")
    
    email = user.get("email")
    # In a real app, you might fetch more details from your DB here
    return {"ok": True, "data": {"email": email, "user": user}}

@router.post("/register")
async def register(
    request: Request,
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),  # NEW FIELD
    mobile: str = Form(...),
    location: str = Form(...),
    role: str = Form(...),
    company_id: str = Form(None),
    company_name: str = Form(None)
):
    service = get_auth_service()
    try:
        # Pass the password to the service
        result = service.register(
            full_name=full_name,
            email=email,
            password=password,
            mobile=mobile,
            location=location,
            role=role,
            company_id=company_id,
            company_name=company_name
        )
        logger.info("User registered successfully", extra={"request_id": getattr(request.state, "request_id", None)})
        return {"ok": True, "data": result}
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/update-password")
async def update_password(request: Request, new_password: str = Form(...)):
    service = get_auth_service()
    user = getattr(request.state, "user", None)
    if not user: raise HTTPException(status_code=401, detail="Authentication required")
    try:
        service.update_password(user, new_password)
        return {"ok": True, "message": "Password updated successfully"}
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to update password")

@router.post("/forgot-password")
async def forgot_password(request: Request, email: str = Form(...)):
    service = get_auth_service()
    try:
        service.send_password_reset(email)
        return {"ok": True, "message": "If an account exists, a reset link has been sent"}
    except Exception:
        return {"ok": True, "message": "If an account exists, a reset link has been sent"}