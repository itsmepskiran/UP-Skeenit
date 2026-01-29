from fastapi import APIRouter, Request, HTTPException, Form
from typing import Optional

from models.auth_models import LoginRequest
from services.auth_service import AuthService
from services.supabase_client import get_client
from utils_others.logger import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])
_auth_service: Optional[AuthService] = None


def get_auth_service() -> AuthService:
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService(get_client())
    return _auth_service


# ---------------------------------------------------------
# LOGIN
# ---------------------------------------------------------
@router.post("/login")
async def login(request: Request, form_data: LoginRequest):
    service = get_auth_service()
    try:
        result = service.login(form_data.email, form_data.password)

        logger.info(
            "User logged in successfully",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )

        return {"ok": True, "data": result}

    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))


# ---------------------------------------------------------
# REGISTER
# ---------------------------------------------------------
@router.post("/register")
async def register(
    request: Request,
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    mobile: str = Form(...),
    location: str = Form(...),
    role: str = Form(...),
    email_redirect_to: Optional[str] = Form(None)
):
    """Register a new user."""
    service = get_auth_service()

    try:
        result = service.register(
            full_name=full_name, 
            email=email, 
            password=password, 
            mobile=mobile, 
            location=location, 
            role=role,
            email_redirect_to=email_redirect_to
        )
        
        logger.info(
            "User registered successfully",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )

        return {"ok": True, "data": result}

    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# UPDATE PASSWORD
# ---------------------------------------------------------
@router.post("/update-password")
async def update_password(request: Request, new_password: str = Form(...)):
    service = get_auth_service()
    user = getattr(request.state, "user", None)

    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        service.update_password(user, new_password)
        return {"ok": True, "message": "Password updated successfully"}

    except Exception:
        raise HTTPException(status_code=400, detail="Failed to update password")


# ---------------------------------------------------------
# FORGOT PASSWORD
# ---------------------------------------------------------
@router.post("/forgot-password")
async def forgot_password(request: Request, email: str = Form(...)):
    service = get_auth_service()

    try:
        service.send_password_reset(email)
        return {"ok": True, "message": "If an account exists, a reset link has been sent"}

    except Exception:
        # Always return success to avoid email enumeration
        return {"ok": True, "message": "If an account exists, a reset link has been sent"}

# Then add the new endpoint to the auth router
@router.post("/confirm-email")
async def confirm_email(request: Request):
    data = await request.json()
    token = data.get('token')
    token_type = data.get('type', 'signup')
    
    if not token:
        raise HTTPException(status_code=400, detail="Missing token")
    
    try:
        # Verify the token with Supabase
        supabase = get_client()
        response = supabase.auth.verify_otp({
            'token': token,
            'type': token_type
        })
        
        if hasattr(response,'error') and response.error:
            raise HTTPException(status_code=400, detail=response.error.message)
        
        return {"message": "Email confirmed successfully"}
        
    except Exception as e:
        logger.error(f"Email confirmation failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid or expired confirmation link")