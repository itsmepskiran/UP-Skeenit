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
    """
    Lazy-load AuthService with a singleton Supabase client.
    """
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService(get_client())
    return _auth_service


# ---------------------------------------------------------
# LOGIN
# ---------------------------------------------------------
# ---------------------------------------------------------
# LOGIN (Supabase Token Based)
# ---------------------------------------------------------
@router.post("/login")
async def login(request: Request):
    """
    Login endpoint that relies entirely on Supabase JWT.
    The frontend sends: Authorization: Bearer <access_token>
    Middleware validates token and attaches user to request.state.user
    """

    # Supabase user injected by AuthMiddleware
    user = getattr(request.state, "user", None)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or missing token")

    # Extract email from Supabase JWT
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Fetch user from DB
    service = get_auth_service()
    db_user = service.get_user_by_email(email)

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found in system")

    logger.info(
        "User login successful",
        extra={"request_id": getattr(request.state, "request_id", None)}
    )

    return {
        "ok": True,
        "role": db_user.role,
        "data": {
            "email": db_user.email,
            "full_name": db_user.full_name,
            "role": db_user.role
        }
    }


# ---------------------------------------------------------
# REGISTER
# ---------------------------------------------------------
@router.post("/register")
async def register(
    request: Request,
    full_name: str = Form(...),
    email: str = Form(...),
    mobile: str = Form(...),
    location: str = Form(...),
    role: str = Form(...),
    company_id: str = Form(None),
    company_name: str = Form(None)
):
    service = get_auth_service()

    try:
        result = service.register(
            full_name=full_name,
            email=email,
            mobile=mobile,
            location=location,
            role=role,
            company_id=company_id,
            company_name=company_name
        )

        logger.info(
            "User registered successfully",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )

        return {"ok": True, "data": result}

    except Exception as e:
        logger.error(
            f"Registration failed: {str(e)}",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------
# UPDATE PASSWORD (Authenticated)
# ---------------------------------------------------------
@router.post("/update-password")
async def update_password(request: Request, new_password: str = Form(...)):
    service = get_auth_service()
    user = getattr(request.state, "user", None)

    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        service.update_password(user, new_password)

        logger.info(
            "Password updated",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )

        return {"ok": True, "message": "Password updated successfully"}

    except Exception:
        logger.error(
            "Password update failed",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )
        raise HTTPException(status_code=400, detail="Failed to update password")


# ---------------------------------------------------------
# FORGOT PASSWORD
# ---------------------------------------------------------
@router.post("/forgot-password")
async def forgot_password(request: Request, email: str = Form(...)):
    service = get_auth_service()

    try:
        service.send_password_reset(email)

        logger.info(
            "Password reset email sent",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )

        # Always return success to avoid email enumeration
        return {"ok": True, "message": "If an account exists, a reset link has been sent"}

    except Exception as e:
        logger.error(
            f"Forgot password error: {str(e)}",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )
        # Still return success to avoid leaking user existence
        return {"ok": True, "message": "If an account exists, a reset link has been sent"}


# ---------------------------------------------------------
# CONFIRM EMAIL
# ---------------------------------------------------------
@router.get("/confirm-email")
async def confirm_email(request: Request, token: str, type: str, redirect_to: str = None):
    service = get_auth_service()

    try:
        service.verify_email_token(token, type)

        logger.info(
            "Email confirmed",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )

        if redirect_to:
            return RedirectResponse(url=redirect_to)

        return {"ok": True, "message": "Email confirmed successfully"}

    except Exception:
        logger.error(
            "Email confirmation failed",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )
        raise HTTPException(status_code=400, detail="Invalid or expired confirmation link")
