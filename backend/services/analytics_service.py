from typing import Optional, Dict, Any, List
from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger


class AnalyticsService:
    """
    Handles analytics event creation and retrieval.
    """

    def __init__(self, client: Optional[Client] = None):
        self.supabase = client or get_client()

    # ---------------------------------------------------------
    # CREATE EVENT
    # ---------------------------------------------------------
    def create_event(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert an analytics event into analytics_events table.
        """
        try:
            res = self.supabase.table("analytics_events").insert(data).execute()

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            logger.info(
                "Analytics event created",
                extra={"user_id": data.get("user_id"), "event_type": data.get("event_type")},
            )

            return res.data

        except Exception as e:
            logger.error(
                f"Analytics event creation failed: {str(e)}",
                extra={"user_id": data.get("user_id")},
            )
            raise RuntimeError("Failed to create analytics event")

    # ---------------------------------------------------------
    # LIST EVENTS FOR USER
    # ---------------------------------------------------------
    def list_events(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all analytics events for a given user.
        """
        try:
            res = (
                self.supabase.table("analytics_events")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            logger.info(
                "Analytics events fetched",
                extra={"user_id": user_id, "count": len(res.data or [])},
            )

            return res.data or []

        except Exception as e:
            logger.error(
                f"Analytics event fetch failed: {str(e)}",
                extra={"user_id": user_id},
            )
            raise RuntimeError("Failed to fetch analytics events")
