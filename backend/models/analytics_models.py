from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict


# ---------------------------------------------------------
# REQUEST MODEL (from frontend)
# ---------------------------------------------------------
class AnalyticsEventRequest(BaseModel):
    event_type: str
    event_data: Optional[Dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    # user_id is injected by backend (request.state.user)
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# RESPONSE MODEL (to frontend)
# ---------------------------------------------------------
class AnalyticsEventResponse(BaseModel):
    id: str
    user_id: str
    event_type: str
    event_data: Optional[Dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
