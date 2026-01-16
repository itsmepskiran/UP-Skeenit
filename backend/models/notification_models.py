from pydantic import BaseModel, ConfigDict
from typing import Optional


# ---------------------------------------------------------
# REQUEST MODEL (from frontend)
# ---------------------------------------------------------
class NotificationRequest(BaseModel):
    title: str
    message: str
    category: str  # e.g., "system", "job_update", "application_update"
    related_id: Optional[str] = None
    is_read: Optional[bool] = False

    # user_id is injected by backend (request.state.user)
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# RESPONSE MODEL (to frontend)
# ---------------------------------------------------------
class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    category: str
    related_id: Optional[str] = None
    is_read: bool
    created_at: Optional[str] = None
    created_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
