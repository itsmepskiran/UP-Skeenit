from fastapi import APIRouter, Request
from models.analytics_models import AnalyticsEvent
from services.analytics_service import AnalyticsService
from utils_others.rbac import ensure_permission

router = APIRouter(prefix="/analytics", tags=["Analytics"])
svc = AnalyticsService()


# ---------------------------------------------------------
# CREATE EVENT (All authenticated users)
# ---------------------------------------------------------
@router.post("/")
async def create_event(request: Request, payload: AnalyticsEvent):
    # No permission needed — all authenticated users allowed
    return svc.create_event(payload.model_dump())


# ---------------------------------------------------------
# LIST EVENTS (Recruiter/Admin)
# ---------------------------------------------------------
@router.get("/")
async def list_events(request: Request):
    ensure_permission(request, "analytics:view")
    return svc.list_events(request.state.user["id"])
