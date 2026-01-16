from typing import Optional, Dict, Any, List
from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger


class DashboardService:
    """
    Provides dashboard summaries for both recruiters and candidates.
    Fetches:
    - User role
    - Jobs (for recruiters)
    - Applications (for both)
    """

    def __init__(self, client: Optional[Client] = None):
        self.supabase = client or get_client()

    # ---------------------------------------------------------
    # PUBLIC API
    # ---------------------------------------------------------
    def get_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Returns dashboard summary for recruiter or candidate.
        Structure:
        {
            "role": "recruiter" | "candidate",
            "jobs": [...],
            "applications": [...]
        }
        """
        try:
            role = self._get_user_role(user_id)

            if role == "recruiter":
                return self._get_recruiter_summary(user_id)

            if role == "candidate":
                return self._get_candidate_summary(user_id)

            raise RuntimeError("Unknown user role")

        except Exception as e:
            logger.error(f"Dashboard summary failed: {str(e)}", extra={"user_id": user_id})
            raise RuntimeError("Failed to fetch dashboard summary")

    # ---------------------------------------------------------
    # PRIVATE HELPERS — USER ROLE
    # ---------------------------------------------------------
    def _get_user_role(self, user_id: str) -> str:
        """
        Fetch role from Supabase Auth metadata.
        """
        auth_user = self.supabase.auth.admin.get_user_by_id(user_id)
        user_obj = getattr(auth_user, "user", None)

        if not user_obj:
            raise RuntimeError("User not found")

        metadata = user_obj.user_metadata or {}
        role = metadata.get("role")

        if not role:
            raise RuntimeError("User role missing")

        return role

    # ---------------------------------------------------------
    # PRIVATE HELPERS — RECRUITER SUMMARY
    # ---------------------------------------------------------
    def _get_recruiter_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Recruiter dashboard:
        - Jobs created by recruiter
        - Applications for those jobs
        """
        try:
            jobs = self._fetch_recruiter_jobs(user_id)
            job_ids = [j["id"] for j in jobs]

            applications = self._fetch_applications_for_jobs(job_ids) if job_ids else []

            logger.info("Recruiter dashboard loaded", extra={"user_id": user_id})

            return {
                "role": "recruiter",
                "jobs": jobs,
                "applications": applications,
            }

        except Exception as e:
            logger.error(f"Recruiter dashboard failed: {str(e)}", extra={"user_id": user_id})
            raise

    def _fetch_recruiter_jobs(self, user_id: str) -> List[Dict[str, Any]]:
        res = (
            self.supabase.table("jobs")
            .select("id, title, status, created_at")
            .eq("created_by", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        if getattr(res, "error", None):
            raise RuntimeError(res.error)

        return res.data or []

    def _fetch_applications_for_jobs(self, job_ids: List[str]) -> List[Dict[str, Any]]:
        res = (
            self.supabase.table("job_applications")
            .select("id, status, ai_score, candidate_id, applied_at, job_id")
            .in_("job_id", job_ids)
            .order("applied_at", desc=True)
            .execute()
        )

        if getattr(res, "error", None):
            raise RuntimeError(res.error)

        return res.data or []

    # ---------------------------------------------------------
    # PRIVATE HELPERS — CANDIDATE SUMMARY
    # ---------------------------------------------------------
    def _get_candidate_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Candidate dashboard:
        - Applications submitted by candidate
        - Jobs corresponding to those applications
        """
        try:
            applications = self._fetch_candidate_applications(user_id)
            job_ids = [a["job_id"] for a in applications]

            jobs = self._fetch_jobs_for_candidate(job_ids) if job_ids else []

            logger.info("Candidate dashboard loaded", extra={"user_id": user_id})

            return {
                "role": "candidate",
                "jobs": jobs,
                "applications": applications,
            }

        except Exception as e:
            logger.error(f"Candidate dashboard failed: {str(e)}", extra={"user_id": user_id})
            raise

    def _fetch_candidate_applications(self, user_id: str) -> List[Dict[str, Any]]:
        res = (
            self.supabase.table("job_applications")
            .select("id, status, ai_score, applied_at, job_id")
            .eq("candidate_id", user_id)
            .order("applied_at", desc=True)
            .execute()
        )

        if getattr(res, "error", None):
            raise RuntimeError(res.error)

        return res.data or []

    def _fetch_jobs_for_candidate(self, job_ids: List[str]) -> List[Dict[str, Any]]:
        res = (
            self.supabase.table("jobs")
            .select("id, title, company, location, job_type, status")
            .in_("id", job_ids)
            .execute()
        )

        if getattr(res, "error", None):
            raise RuntimeError(res.error)

        return res.data or []
