from fastapi import APIRouter, Request
from services.dashboard_service import DashboardService
from utils_others.rbac import ensure_role

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
svc = DashboardService()


@router.get("/")
async def get_dashboard(request: Request):
    user = request.state.user
    role = user["user_metadata"]["role"]

    if role == "recruiter":
        ensure_role(request, ["recruiter", "admin"])

    elif role == "candidate":
        ensure_role(request, ["candidate"])

    return svc.get_summary(user["id"])
