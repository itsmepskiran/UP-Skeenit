from fastapi import APIRouter, Request, HTTPException
from datetime import datetime
from typing import Optional

from services.notification_service import NotificationService
from services.supabase_client import get_client
from middleware.role_required import require_role
from models.notification_models import NotificationRequest
from utils_others.logger import logger

router = APIRouter(tags=["Notification"])

_service: Optional[NotificationService] = None


def get_notification_service() -> NotificationService:
    global _service
    if _service is None:
        _service = NotificationService(get_client())
    return _service


# ---------------------------------------------------------
# SEND NOTIFICATION
# ---------------------------------------------------------
@router.post("/notify")
@require_role("recruiter")  # or "admin" if needed
async def send_notification(request: Request, payload: NotificationRequest):
    user = request.state.user
    svc = get_notification_service()

    try:
        notif = payload.dict()
        notif["created_at"] = datetime.utcnow().isoformat()
        notif["created_by"] = user["id"]

        result = svc.create_notification(notif)

        logger.info(
            "Notification created",
            extra={
                "request_id": request.state.request_id,
                "user_id": user["id"]
            }
        )

        return {"ok": True, "data": result}

    except Exception as e:
        logger.error(
            f"Notification error: {str(e)}",
            extra={
                "request_id": request.state.request_id,
                "user_id": user["id"]
            }
        )
        raise HTTPException(status_code=500, detail="Failed to create notification")
