from typing import Optional, Dict, Any
from supabase import Client
from .supabase_client import get_client

class DashboardService:
    def __init__(self, client: Optional[Client] = None):
        self.supabase = client or get_client()

    def get_summary(self, user_id: str) -> dict:
        # ---------------------------------------------------------
        # Fetch user role from Supabase Auth (correct source)
        # ---------------------------------------------------------
        auth_user = self.supabase.auth.admin.get_user_by_id(user_id)
        user_obj = getattr(auth_user, "user", None)

        if not user_obj:
            raise Exception("User not found")

        metadata = user_obj.user_metadata or {}
        role = metadata.get("role")

        if not role:
            raise Exception("User role missing")

        summary = {"role": role, "jobs": [], "applications": []}

        # ---------------------------------------------------------
        # Recruiter Dashboard
        # ---------------------------------------------------------
        if role == "recruiter":
            jobs_resp = (
                self.supabase.table("jobs")
                .select("id, title, status, created_at")
                .eq("created_by", user_id)
                .execute()
            )
            jobs = jobs_resp.data or []
            summary["jobs"] = jobs

            job_ids = [j["id"] for j in jobs]

            if job_ids:
                apps_resp = (
                    self.supabase.table("job_applications")
                    .select("id, status, ai_score, candidate_id, applied_at, job_id")
                    .in_("job_id", job_ids)
                    .execute()
                )
                summary["applications"] = apps_resp.data or []

        # ---------------------------------------------------------
        # Candidate Dashboard
        # ---------------------------------------------------------
        elif role == "candidate":
            apps_resp = (
                self.supabase.table("job_applications")
                .select("id, status, ai_score, applied_at, job_id")
                .eq("candidate_id", user_id)
                .execute()
            )
            applications = apps_resp.data or []
            summary["applications"] = applications

            job_ids = [a["job_id"] for a in applications]

            if job_ids:
                jobs_resp = (
                    self.supabase.table("jobs")
                    .select("id, title, company, location, job_type, status")
                    .in_("id", job_ids)
                    .execute()
                )
                summary["jobs"] = jobs_resp.data or []

        else:
            raise Exception("Unknown user role")

        return summary
