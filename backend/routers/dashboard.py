from fastapi import APIRouter, Request, HTTPException
from services.dashboard_service import DashboardService
from utils_others.rbac import ensure_role, ensure_permission

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
svc = DashboardService()


@router.get("/")
async def get_dashboard(request: Request):
    user = request.state.user

    # Safely extract role
    metadata = user.get("user_metadata") or {}
    role = metadata.get("role")

    if not role:
        raise HTTPException(status_code=400, detail="User role missing")

    # Permission check (optional but recommended)
    ensure_permission(request, "dashboard:view")

    # Role enforcement
    if role == "recruiter":
        ensure_role(request, ["recruiter", "admin"])

    elif role == "candidate":
        ensure_role(request, ["candidate"])

    else:
        raise HTTPException(status_code=403, detail="Invalid role")

    try:
        summary = svc.get_summary(user["id"])
        return {"ok": True, "data": summary}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
