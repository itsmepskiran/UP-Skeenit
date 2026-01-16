from typing import Optional, Dict, Any, List
from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger


class RecruiterService:
    """
    Handles all recruiter-side operations:
    - Job CRUD
    - Company management
    - Recruiter profile management
    - Candidate details aggregation
    """

    def __init__(self, client: Optional[Client] = None):
        self.supabase = client or get_client()

    # ---------------------------------------------------------
    # JOB CRUD
    # ---------------------------------------------------------
    def post_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            res = self.supabase.table("jobs").insert(job_data).execute()

            if getattr(res, "error", None):
                raise Exception(res.error)

            logger.info("Job posted", extra={"created_by": job_data.get("created_by")})

            return res.data

        except Exception as e:
            logger.error(f"Job post failed: {str(e)}", extra={"created_by": job_data.get("created_by")})
            raise RuntimeError("Failed to post job")

    def list_jobs(self, recruiter_id: str) -> List[Dict[str, Any]]:
        try:
            res = (
                self.supabase.table("jobs")
                .select("*")
                .eq("created_by", recruiter_id)
                .order("created_at", desc=True)
                .execute()
            )

            if getattr(res, "error", None):
                raise Exception(res.error)

            return res.data

        except Exception as e:
            logger.error(f"List jobs failed: {str(e)}", extra={"recruiter_id": recruiter_id})
            raise RuntimeError("Failed to fetch jobs")

    def get_job(self, job_id: str) -> Dict[str, Any]:
        try:
            res = (
                self.supabase.table("jobs")
                .select("*")
                .eq("id", job_id)
                .single()
                .execute()
            )

            if getattr(res, "error", None):
                raise Exception(res.error)

            return res.data

        except Exception as e:
            logger.error(f"Get job failed: {str(e)}", extra={"job_id": job_id})
            raise RuntimeError("Job not found")

    def update_job(self, job_id: str, update_data: Dict[str, Any], recruiter_id: Optional[str]) -> Dict[str, Any]:
        try:
            query = self.supabase.table("jobs").update(update_data).eq("id", job_id)

            if recruiter_id:
                query = query.eq("created_by", recruiter_id)

            res = query.execute()

            if getattr(res, "error", None):
                raise Exception(res.error)

            logger.info("Job updated", extra={"job_id": job_id, "recruiter_id": recruiter_id})

            return res.data

        except Exception as e:
            logger.error(f"Update job failed: {str(e)}", extra={"job_id": job_id, "recruiter_id": recruiter_id})
            raise RuntimeError("Failed to update job")

    def delete_job(self, job_id: str, recruiter_id: Optional[str]) -> Dict[str, Any]:
        try:
            query = self.supabase.table("jobs").delete().eq("id", job_id)

            if recruiter_id:
                query = query.eq("created_by", recruiter_id)

            res = query.execute()

            if getattr(res, "error", None):
                raise Exception(res.error)

            logger.info("Job deleted", extra={"job_id": job_id, "recruiter_id": recruiter_id})

            return res.data

        except Exception as e:
            logger.error(f"Delete job failed: {str(e)}", extra={"job_id": job_id, "recruiter_id": recruiter_id})
            raise RuntimeError("Failed to delete job")

    # ---------------------------------------------------------
    # COMPANY MANAGEMENT
    # ---------------------------------------------------------
    def list_companies(self) -> List[Dict[str, Any]]:
        try:
            res = (
                self.supabase.table("companies")
                .select("id,name,website")
                .order("name")
                .execute()
            )

            if getattr(res, "error", None):
                raise Exception(res.error)

            return res.data

        except Exception as e:
            logger.error(f"List companies failed: {str(e)}")
            raise RuntimeError("Failed to fetch companies")

    def create_company(self, name: str, created_by: str, description: Optional[str], website: Optional[str]) -> Dict[str, Any]:
        try:
            company_id = self._generate_company_id(name)

            payload = {
                "id": company_id,
                "name": name,
                "description": description,
                "website": website,
                "created_by": created_by,
            }

            res = self.supabase.table("companies").insert(payload).execute()

            if getattr(res, "error", None):
                raise Exception(res.error)

            logger.info("Company created", extra={"company_id": company_id, "created_by": created_by})

            return {"company_id": company_id, "company": res.data}

        except Exception as e:
            logger.error(f"Create company failed: {str(e)}", extra={"created_by": created_by})
            raise RuntimeError("Failed to create company")

    # ---------------------------------------------------------
    # RECRUITER PROFILE
    # ---------------------------------------------------------
    def upsert_profile(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if not payload.get("user_id"):
                raise ValueError("user_id is required")

            res = (
                self.supabase.table("recruiter_profiles")
                .upsert(payload, on_conflict="user_id")
                .execute()
            )

            if getattr(res, "error", None):
                raise Exception(res.error)

            logger.info("Recruiter profile saved", extra={"user_id": payload.get("user_id")})

            return res.data

        except Exception as e:
            logger.error(f"Upsert recruiter profile failed: {str(e)}", extra={"user_id": payload.get("user_id")})
            raise RuntimeError("Failed to save recruiter profile")

    # ---------------------------------------------------------
    # CANDIDATE DETAILS
    # ---------------------------------------------------------
    def get_candidate_details(self, candidate_id: str, job_id: Optional[str]) -> Dict[str, Any]:
        try:
            profile = self._fetch_candidate_profile(candidate_id)
            application = self._fetch_candidate_application(candidate_id, job_id)
            resume_url = self._generate_resume_signed_url(profile)
            general_video = self._fetch_general_video(candidate_id)

            return {
                "candidate": profile,
                "application": application,
                "resume_url": resume_url,
                "general_video": general_video
            }

        except Exception as e:
            logger.error(f"Candidate details fetch failed: {str(e)}", extra={"candidate_id": candidate_id})
            raise RuntimeError("Failed to fetch candidate details")

    # ---------------------------------------------------------
    # PRIVATE HELPERS
    # ---------------------------------------------------------
    def _generate_company_id(self, name: str) -> str:
        import secrets, string
        base = ''.join(ch for ch in name if ch.isalpha()).upper()
        if len(base) < 8:
            base += ''.join(secrets.choice(string.ascii_uppercase) for _ in range(8 - len(base)))
        return base[:8]

    def _fetch_candidate_profile(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        res = (
            self.supabase.table("candidate_profiles")
            .select("*")
            .eq("user_id", candidate_id)
            .single()
            .execute()
        )
        return getattr(res, "data", None)

    def _fetch_candidate_application(self, candidate_id: str, job_id: Optional[str]) -> Optional[Dict[str, Any]]:
        if job_id:
            query = (
                self.supabase.table("job_applications")
                .select("*")
                .eq("candidate_id", candidate_id)
                .eq("job_id", job_id)
                .single()
            )
        else:
            query = (
                self.supabase.table("job_applications")
                .select("*")
                .eq("candidate_id", candidate_id)
                .order("applied_at", desc=True)
                .limit(1)
                .single()
            )

        res = query.execute()
        return getattr(res, "data", None)

    def _generate_resume_signed_url(self, profile: Optional[Dict[str, Any]]) -> Optional[str]:
        if not profile or not profile.get("resume_url"):
            return None

        try:
            signed = self.supabase.storage.from_("resumes").create_signed_url(
                profile["resume_url"], 3600
            )
            return signed.get("signedURL")
        except Exception:
            return None

    def _fetch_general_video(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        res = (
            self.supabase.table("general_video_interviews")
            .select("*")
            .eq("candidate_id", candidate_id)
            .single()
            .execute()
        )
        return getattr(res, "data", None)
