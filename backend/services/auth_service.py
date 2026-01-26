import os, secrets, string
from typing import Optional, Dict, Any

from supabase import Client
from services.supabase_client import get_client
from utils_others.logger import logger

class AuthService:
    """
    Handles authentication with 'Register with Password' flow.
    """

    def __init__(self, client: Optional[Client] = None) -> None:
        self.supabase = client or get_client()
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        # Ensure this points to 'https://login.skreenit.com' (no trailing slash)
        self.frontend_url = os.getenv("FRONTEND_BASE_URL", "https://login.skreenit.com")

    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user with email + password."""
        try:
            res = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": password,
            })
            session = getattr(res, "session", None)
            if not session:
                raise ValueError("Invalid credentials")
            logger.info("User login successful", extra={"email": email})
            return {
                "access_token": session.access_token,
                "user": getattr(res, "user", None)
            }
        except Exception as e:
            logger.error(f"Login failed: {str(e)}", extra={"email": email})
            raise ValueError("Invalid email or password")

    def register(
        self,
        full_name: str,
        email: str,
        password: str,  # Now taking password from user
        mobile: str,
        location: str,
        role: str,
        company_id: Optional[str] = None,
        company_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Register a new user with a provided password.
        Supabase will send the confirmation email.
        """
        try:
            # 1. Create user in Supabase with the USER PROVIDED password
            auth_res = self.supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "email_redirect_to": f"{self.frontend_url}/confirm-email",
                    "data": {
                        "full_name": full_name,
                        "mobile": mobile,
                        "location": location,
                        "role": role,
                        "onboarded": False,
                        "password_set": True,  # Password is now set!
                        **({"company_id": company_id} if company_id else {}),
                        **({"company_name": company_name} if company_name else {}),
                    }
                }
            })

            user = getattr(auth_res, "user", None)
            if not user:
                raise ValueError("Failed to create user in Supabase")

            # 2. Handle Recruiter Company Logic
            final_company_id = self._handle_recruiter_company_creation(
                user_id=user.id,
                role=role,
                company_id=company_id,
                company_name=company_name
            )

            logger.info("User registered successfully", extra={"email": email})

            return {
                "user_id": user.id,
                "email": email,
                "company_id": final_company_id
            }

        except Exception as e:
            msg = str(e).lower()
            if "already registered" in msg or "already exists" in msg:
                raise ValueError("This email is already registered")
            logger.error(f"Registration failed: {str(e)}", extra={"email": email})
            raise RuntimeError(f"Registration failed: {str(e)}")

    # ---------------------------------------------------------
    # OTHER METHODS (Password Update, Reset, Helpers)
    # ---------------------------------------------------------
    def update_password(self, user: dict, new_password: str) -> None:
        try:
            user_id = user["id"]
            self.supabase.auth.admin.update_user_by_id(
                user_id=user_id,
                attributes={"password": new_password, "user_metadata": {**user.get("user_metadata", {}), "onboarded": True}}
            )
            logger.info("Password updated", extra={"user_id": user_id})
        except Exception as e:
            logger.error(f"Password update failed: {str(e)}")
            raise RuntimeError("Failed to update password")

    def send_password_reset(self, email: str) -> None:
        try:
            redirect_to = f"{self.frontend_url}/update-password.html"
            self.supabase.auth.reset_password_email(email, {"redirect_to": redirect_to})
            logger.info("Password reset email sent", extra={"email": email})
        except Exception as e:
            logger.error(f"Password reset failed: {str(e)}")
            raise RuntimeError("Failed to send password reset email")

    def _handle_recruiter_company_creation(self, user_id: str, role: str, company_id: Optional[str], company_name: Optional[str]) -> Optional[str]:
        if role != "recruiter": return company_id
        if company_id: return company_id
        if not company_name: return None
        try:
            generated_id = self._generate_company_id(company_name)
            self.supabase.table("companies").insert({"id": generated_id, "name": company_name, "created_by": user_id}).execute()
            self.supabase.auth.admin.update_user_by_id(user_id, {
                "user_metadata": {"role": "recruiter", "company_id": generated_id, "company_name": company_name, "onboarded": False, "password_set": True}
            })
            return generated_id
        except Exception as e:
            logger.error(f"Company creation failed: {str(e)}")
            return None

    def _generate_company_id(self, name: str) -> str:
        base = ''.join(ch for ch in name if ch.isalpha()).upper()
        if len(base) < 8: base += ''.join(secrets.choice(string.ascii_uppercase) for _ in range(8 - len(base)))
        return base[:8]