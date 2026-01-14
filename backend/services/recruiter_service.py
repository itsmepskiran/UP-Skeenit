from typing import Optional, List, Dict, Any
from supabase import Client
from .supabase_client import get_client

class RecruiterService:
    def __init__(self, client: Optional[Client] = None):
        self.supabase = client or get_client()

    # ---------------------------------------------------------
    # JOB CRUD
    # ---------------------------------------------------------
    def post_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        res = self.supabase.table("jobs").insert(job_data).execute()
        if getattr(res, "error", None):
            raise Exception(f"Job post error: {res.error}")
        return {"status": "posted", "data": res.data}

    def list_jobs(self, recruiter_id: str) -> List[Dict[str, Any]]:
        res = (
            self.supabase.table("jobs")
            .select("*")
            .eq("created_by", recruiter_id)
            .execute()
        )
        if getattr(res, "error", None):
            raise Exception(f"Job list error: {res.error}")
        return res.data

    def get_job(self, job_id: str) -> Dict[str, Any]:
        res = (
            self.supabase.table("jobs")
            .select("*")
            .eq("id", job_id)
            .single()
            .execute()
        )
        if getattr(res, "error", None):
            raise Exception(f"Get job error: {res.error}")
        return res.data

    def update_job(self, job_id: str, update_data: Dict[str, Any], recruiter_id: Optional[str] = None) -> Dict[str, Any]:
        query = self.supabase.table("jobs").update(update_data).eq("id", job_id)
        if recruiter_id:
            query = query.eq("created_by", recruiter_id)
        res = query.execute()
        if getattr(res, "error", None):
            raise Exception(f"Update job error: {res.error}")
        return {"ok": True, "data": res.data}

    def delete_job(self, job_id: str, recruiter_id: Optional[str] = None) -> Dict[str, Any]:
        query = self.supabase.table("jobs").delete().eq("id", job_id)
        if recruiter_id:
            query = query.eq("created_by", recruiter_id)
        res = query.execute()
        if getattr(res, "error", None):
            raise Exception(f"Delete job error: {res.error}")
        return {"ok": True, "data": res.data}

    # ---------------------------------------------------------
    # COMPANY MANAGEMENT
    # ---------------------------------------------------------
    def list_companies(self) -> List[Dict[str, Any]]:
        res = (
            self.supabase.table("companies")
            .select("id,name,website")
            .order("name")
            .execute()
        )
        if getattr(res, "error", None):
            raise Exception(f"Company list error: {res.error}")
        return res.data

    def create_company(self, name: str, created_by: str, description: Optional[str] = None, website: Optional[str] = None) -> Dict[str, Any]:
        import random, string
        base = ''.join(ch for ch in name if ch.isalpha()).upper()
        if len(base) < 8:
            base += ''.join(random.choice(string.ascii_uppercase) for _ in range(8 - len(base)))
        company_id = base[:8]

        payload = {
            "id": company_id,
            "name": name,
            "description": description,
            "website": website,
            "created_by": created_by,
        }

        res = self.supabase.table("companies").insert(payload).execute()
        if getattr(res, "error", None):
            raise Exception(f"Create company error: {res.error}")

        return {"company_id": company_id, "company": res.data}

    # ---------------------------------------------------------
    # RECRUITER PROFILE
    # ---------------------------------------------------------
    def upsert_profile(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not payload.get("user_id"):
            raise Exception("user_id is required")

        res = (
            self.supabase.table("recruiter_profiles")
            .upsert(payload, on_conflict="user_id")
            .execute()
        )
        if getattr(res, "error", None):
            raise Exception(f"Upsert recruiter profile error: {res.error}")

        return {"status": "saved", "profile": res.data}

    # ---------------------------------------------------------
    # CANDIDATE DETAILS (NEW)
    # ---------------------------------------------------------
    def get_candidate_details(self, candidate_id: str, job_id: Optional[str] = None) -> Dict[str, Any]:
        # Candidate profile
        profile_res = (
            self.supabase.table("candidate_profiles")
            .select("*")
            .eq("user_id", candidate_id)
            .single()
            .execute()
        )
        profile = getattr(profile_res, "data", None)

        # Application details
        if job_id:
            app_res = (
                self.supabase.table("job_applications")
                .select("*")
                .eq("candidate_id", candidate_id)
                .eq("job_id", job_id)
                .single()
                .execute()
            )
        else:
            app_res = (
                self.supabase.table("job_applications")
                .select("*")
                .eq("candidate_id", candidate_id)
                .order("applied_at", desc=True)
                .limit(1)
                .single()
                .execute()
            )

        application = getattr(app_res, "data", None)

        # Resume signed URL
        resume_url = None
        if profile and profile.get("resume_url"):
            try:
                signed = self.supabase.storage.from_("resumes").create_signed_url(
                    profile["resume_url"], 3600
                )
                resume_url = signed.get("signedURL")
            except Exception:
                resume_url = None

        # General video
        video_res = (
            self.supabase.table("general_video_interviews")
            .select("*")
            .eq("candidate_id", candidate_id)
            .single()
            .execute()
        )
        general_video = getattr(video_res, "data", None)

        return {
            "candidate": profile,
            "application": application,
            "resume_url": resume_url,
            "general_video": general_video
        }
