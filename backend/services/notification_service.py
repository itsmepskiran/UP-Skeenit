from typing import Optional, Dict, Any, List
from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger
from datetime import datetime


class NotificationService:
    """
    Handles creation and retrieval of notifications.
    """

    def __init__(self, client: Optional[Client] = None):
        self.supabase = client or get_client()

    # ---------------------------------------------------------
    # CREATE NOTIFICATION
    # ---------------------------------------------------------
    def create_notification(self, notif: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert a notification into the notifications table.
        """
        try:
            notif["created_at"] = datetime.utcnow().isoformat()

            res = self.supabase.table("notifications").insert(notif).execute()

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            logger.info(
                "Notification created",
                extra={"user_id": notif.get("created_by"), "type": notif.get("category")},
            )

            return res.data

        except Exception as e:
            logger.error(
                f"Notification creation failed: {str(e)}",
                extra={"user_id": notif.get("created_by")},
            )
            raise RuntimeError("Failed to create notification")

    # ---------------------------------------------------------
    # LIST NOTIFICATIONS FOR USER
    # ---------------------------------------------------------
    def list_notifications(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all notifications for a user.
        """
        try:
            res = (
                self.supabase.table("notifications")
                .select("*")
                .eq("created_by", user_id)
                .order("created_at", desc=True)
                .execute()
            )

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            logger.info(
                "Notifications fetched",
                extra={"user_id": user_id, "count": len(res.data or [])},
            )

            return res.data or []

        except Exception as e:
            logger.error(
                f"Notification fetch failed: {str(e)}",
                extra={"user_id": user_id},
            )
            raise RuntimeError("Failed to fetch notifications")

    # ---------------------------------------------------------
    # MARK AS READ
    # ---------------------------------------------------------
    def mark_as_read(self, notification_id: str, user_id: str) -> Dict[str, Any]:
        """
        Mark a notification as read.
        """
        try:
            res = (
                self.supabase.table("notifications")
                .update({"is_read": True})
                .eq("id", notification_id)
                .eq("created_by", user_id)
                .execute()
            )

            if getattr(res, "error", None):
                raise RuntimeError(res.error)

            logger.info(
                "Notification marked as read",
                extra={"notification_id": notification_id, "user_id": user_id},
            )

            return res.data

        except Exception as e:
            logger.error(
                f"Mark notification read failed: {str(e)}",
                extra={"notification_id": notification_id, "user_id": user_id},
            )
            raise RuntimeError("Failed to mark notification as read")
