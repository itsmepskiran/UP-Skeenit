import time
from typing import Any, Dict, List, Optional

from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger


class ApplicantService:
    """
    Handles all candidate-side operations:
    - Draft save/load
    - Detailed profile form (profile, education, experience, skills)
    - Resume upload + signed URL retrieval
    - General video info
    - Application details
    """

    def __init__(self, client: Optional[Client] = None):
        self.supabase = client or get_client()

    # ---------------------------------------------------------
    # DRAFT HANDLING
    # ---------------------------------------------------------
    def save_draft(self, candidate_id: str, draft_payload: Dict[str, Any]) -> None:
        """
        Upsert candidate draft JSON into candidate_drafts table.
        """
        try:
            row = {"candidate_id": candidate_id, "draft": draft_payload}
            res = (
                self.supabase.table("candidate_drafts")
                .upsert(row, on_conflict="candidate_id")
                .execute()
            )

            if getattr(res, "error", None):
                raise Exception(res.error)

            logger.info("Draft saved", extra={"candidate_id": candidate_id})

        except Exception as e:
            logger.error(f"Draft save failed: {str(e)}", extra={"candidate_id": candidate_id})
            raise RuntimeError("Failed to save draft")

    def get_draft(self, candidate_id: str) -> Dict[str, Any]:
        """
        Fetch candidate draft JSON from candidate_drafts table.
        Returns {} if not found or on error.
        """
        try:
            res = (
                self.supabase.table("candidate_drafts")
                .select("draft")
                .eq("candidate_id", candidate_id)
                .single()
                .execute()
            )

            if getattr(res, "error", None):
                return {}

            data = getattr(res, "data", None) or {}
            return data.get("draft") or {}

        except Exception as e:
            logger.error(f"Draft fetch failed: {str(e)}", extra={"candidate_id": candidate_id})
            return {}

    # ---------------------------------------------------------
    # DETAILED FORM (PROFILE + EDUCATION + EXPERIENCE + SKILLS)
    # ---------------------------------------------------------
    def save_detailed_form(
        self,
        candidate_id: str,
        profile: Optional[Dict[str, Any]] = None,
        education: Optional[List[Dict[str, Any]]] = None,
        experience: Optional[List[Dict[str, Any]]] = None,
        skills: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """
        Save full candidate details:
        - candidate_profiles
        - candidate_education
        - candidate_experience
        - candidate_skills
        """
        try:
            if profile is not None:
                self._save_profile(candidate_id, profile)

            if education is not None:
                self._save_education(candidate_id, education)

            if experience is not None:
                self._save_experience(candidate_id, experience)

            if skills is not None:
                self._save_skills(candidate_id, skills)

            # Update onboarded status to True
            self.supabase.auth.admin.update_user_by_id(
                candidate_id,
                {"user_metadata": {"onboarded": True}}
            )

            logger.info("Detailed form saved", extra={"candidate_id": candidate_id})

        except Exception as e:
            logger.error(f"Detailed form save failed: {str(e)}", extra={"candidate_id": candidate_id})
            raise RuntimeError("Failed to save detailed form")

    def get_detailed_form(self, candidate_id: str) -> Dict[str, Any]:
        """
        Fetch full candidate details:
        - profile
        - education
        - experience
        - skills
        """
        try:
            result: Dict[str, Any] = {}

            prof = (
                self.supabase.table("candidate_profiles")
                .select("*")
                .eq("user_id", candidate_id)
                .single()
                .execute()
            )
            result["profile"] = getattr(prof, "data", None)

            edu = (
                self.supabase.table("candidate_education")
                .select("*")
                .eq("candidate_id", candidate_id)
                .execute()
            )
            result["education"] = getattr(edu, "data", []) or []

            exp = (
                self.supabase.table("candidate_experience")
                .select("*")
                .eq("candidate_id", candidate_id)
                .execute()
            )
            result["experience"] = getattr(exp, "data", []) or []

            skl = (
                self.supabase.table("candidate_skills")
                .select("*")
                .eq("candidate_id", candidate_id)
                .execute()
            )
            result["skills"] = getattr(skl, "data", []) or []

            return result

        except Exception as e:
            logger.error(f"Detailed form fetch failed: {str(e)}", extra={"candidate_id": candidate_id})
            raise RuntimeError("Failed to fetch detailed form")

    # ---------------------------------------------------------
    # RESUME HANDLING
    # ---------------------------------------------------------
    def upload_resume(
        self,
        candidate_id: str,
        filename: str,
        content: bytes,
        content_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Upload resume to 'resumes' bucket and update candidate_profiles.resume_url.
        Returns signed URL.
        """
        try:
            safe_name = (filename or "resume").replace(" ", "_")
            path = f"{candidate_id}/{int(time.time() * 1000)}-{safe_name}"

            # Upload to storage
            upload_res = self.supabase.storage.from_("resumes").upload(
                path,
                content,
                {
                    "content-type": content_type or "application/octet-stream",
                    "upsert": True,
                },
            )

            if getattr(upload_res, "error", None):
                raise Exception(upload_res.error)

            # Update profile with resume path
            try:
                self.supabase.table("candidate_profiles").update(
                    {"resume_url": path}
                ).eq("user_id", candidate_id).execute()
            except Exception as e:
                logger.error(
                    f"Failed to update resume_url in profile: {str(e)}",
                    extra={"candidate_id": candidate_id, "path": path},
                )

            # Generate signed URL
            signed_res = self.supabase.storage.from_("resumes").create_signed_url(
                path, 3600
            )

            if getattr(signed_res, "error", None):
                raise Exception(signed_res.error)

            signed_url = signed_res.get("signedURL") or signed_res.get("signed_url")

            logger.info("Resume uploaded", extra={"candidate_id": candidate_id, "path": path})

            return {"resume_path": path, "resume_url": signed_url}

        except Exception as e:
            logger.error(f"Resume upload failed: {str(e)}", extra={"candidate_id": candidate_id})
            raise RuntimeError("Failed to upload resume")
            
    def get_resume_url(self, candidate_id: str) -> Dict[str, Any]:
        """
        Get signed resume URL for candidate.
        """
        try:
            path = self._get_resume_path_from_profile(candidate_id)

            if not path:
                path = self._get_latest_resume_from_storage(candidate_id)

            if not path:
                raise RuntimeError("Resume not found")

            signed_res = self.supabase.storage.from_("resumes").create_signed_url(
                path, 3600
            )

            if getattr(signed_res, "error", None):
                raise Exception(signed_res.error)

            signed_url = signed_res.get("signedURL") or signed_res.get("signed_url")

            logger.info("Resume URL fetched", extra={"candidate_id": candidate_id})

            return {"resume_url": signed_url}

        except Exception as e:
            logger.error(f"Resume URL fetch failed: {str(e)}", extra={"candidate_id": candidate_id})
            raise RuntimeError("Failed to fetch resume URL")

    # ---------------------------------------------------------
    # GENERAL VIDEO
    # ---------------------------------------------------------
    def get_general_video(self, candidate_id: str) -> Dict[str, Any]:
        """
        Fetch general video interview info for candidate.
        Returns:
        - status
        - video_url
        - scores (if ai_analysis present)
        """
        try:
            res = (
                self.supabase.table("general_video_interviews")
                .select("*")
                .eq("candidate_id", candidate_id)
                .single()
                .execute()
            )

            if getattr(res, "error", None):
                return {"status": "missing"}

            data = getattr(res, "data", None)
            if not data:
                return {"status": "missing"}

            out: Dict[str, Any] = {
                "status": data.get("status") or "completed",
                "video_url": data.get("video_url"),
            }

            ai = data.get("ai_analysis") or {}
            if isinstance(ai, dict) and ai:
                out["scores"] = ai.get("scores") or ai

            return out

        except Exception as e:
            logger.error(f"General video fetch failed: {str(e)}", extra={"candidate_id": candidate_id})
            return {"status": "missing"}

    # ---------------------------------------------------------
    # APPLICATION DETAILS
    # ---------------------------------------------------------
    def get_application_details(self, application_id: str) -> Dict[str, Any]:
        """
        Fetch a single job application by ID.
        """
        try:
            res = (
                self.supabase.table("job_applications")
                .select("*")
                .eq("id", application_id)
                .single()
                .execute()
            )

            if getattr(res, "error", None):
                raise Exception(res.error)

            data = getattr(res, "data", None)
            if not data:
                raise RuntimeError("Application not found")

            return data

        except Exception as e:
            logger.error(
                f"Application details fetch failed: {str(e)}",
                extra={"application_id": application_id},
            )
            raise RuntimeError("Failed to fetch application details")

    # ---------------------------------------------------------
    # PRIVATE HELPERS
    # ---------------------------------------------------------
    def _save_profile(self, candidate_id: str, profile: Dict[str, Any]) -> None:
        profile = {**profile}
        profile["user_id"] = candidate_id

        res = (
            self.supabase.table("candidate_profiles")
            .upsert(profile, on_conflict="user_id")
            .execute()
        )
        err = getattr(res, "error", None)
        if err:
            raise Exception(f"Profile save error: {err}")

    def _save_education(self, candidate_id: str, education: List[Dict[str, Any]]) -> None:
        self.supabase.table("candidate_education").delete().eq(
            "candidate_id", candidate_id
        ).execute()

        if not education:
            return

        to_insert = [{**e, "candidate_id": candidate_id} for e in education]
        res = self.supabase.table("candidate_education").insert(to_insert).execute()
        err = getattr(res, "error", None)
        if err:
            raise Exception(f"Education save error: {err}")

    def _save_experience(self, candidate_id: str, experience: List[Dict[str, Any]]) -> None:
        self.supabase.table("candidate_experience").delete().eq(
            "candidate_id", candidate_id
        ).execute()

        if not experience:
            return

        to_insert = [{**e, "candidate_id": candidate_id} for e in experience]
        res = self.supabase.table("candidate_experience").insert(to_insert).execute()
        err = getattr(res, "error", None)
        if err:
            raise Exception(f"Experience save error: {err}")

    def _save_skills(self, candidate_id: str, skills: List[Dict[str, Any]]) -> None:
        self.supabase.table("candidate_skills").delete().eq(
            "candidate_id", candidate_id
        ).execute()

        if not skills:
            return

        normalized: List[Dict[str, Any]] = []
        for s in skills:
            normalized.append(
                {
                    "candidate_id": candidate_id,
                    "skill_name": s.get("skill_name") or s.get("name"),
                    "proficiency_level": s.get("proficiency_level") or s.get("level"),
                    "years_experience": s.get("years_experience") or s.get("years") or 0,
                }
            )

        to_insert = [row for row in normalized if row.get("skill_name")]
        if not to_insert:
            return

        res = self.supabase.table("candidate_skills").insert(to_insert).execute()
        err = getattr(res, "error", None)
        if err:
            raise Exception(f"Skills save error: {err}")

    def _get_resume_path_from_profile(self, candidate_id: str) -> Optional[str]:
        try:
            prof = (
                self.supabase.table("candidate_profiles")
                .select("resume_url")
                .eq("user_id", candidate_id)
                .single()
                .execute()
            )
            data = getattr(prof, "data", {}) or {}
            return data.get("resume_url")
        except Exception:
            return None

    def _get_latest_resume_from_storage(self, candidate_id: str) -> Optional[str]:
        try:
            listing = self.supabase.storage.from_("resumes").list(candidate_id)
            files = getattr(listing, "data", []) or []
            files.sort(key=lambda f: f.get("name", ""), reverse=True)
            if not files:
                return None
            return f"{candidate_id}/{files[0]['name']}"
        except Exception:
            return None
