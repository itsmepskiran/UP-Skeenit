import os, secrets, string
from typing import Optional, Dict, Any

from supabase import Client
from services.supabase_client import get_client
from utils_others.resend_email import send_email
from utils_others.logger import logger


class AuthService:
    """
    Handles all authentication-related operations:
    - Login
    - Registration
    - Email confirmation
    - Password updates
    - Recruiter company creation
    - Email notifications
    """

    def __init__(self, client: Optional[Client] = None) -> None:
        self.supabase = client or get_client()
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.frontend_url = os.getenv("FRONTEND_BASE_URL", "https://login.skreenit.com")

    # ---------------------------------------------------------
    # LOGIN
    # ---------------------------------------------------------
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate user with email + password.
        Returns access token + user object.
        """
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

    # ---------------------------------------------------------
    # EMAIL CONFIRMATION
    # ---------------------------------------------------------
    def verify_email_token(self, token: str, type: str) -> Dict[str, Any]:
        """
        Verify email confirmation or recovery token.
        """
        try:
            result = self.supabase.auth.verify_otp({
                "token": token,
                "type": type,
                "email": None
            })

            logger.info("Email verification successful")

            return {"user": getattr(result, "user", None)}

        except Exception as e:
            logger.error(f"Email verification failed: {str(e)}")
            raise RuntimeError("Invalid or expired confirmation token")

    # ---------------------------------------------------------
    # REGISTRATION
    # ---------------------------------------------------------
    def register(
        self,
        full_name: str,
        email: str,
        mobile: str,
        location: str,
        role: str,
        company_id: Optional[str] = None,
        company_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Register a new user in Supabase Auth.
        Handles:
        - Temporary password generation
        - Recruiter company creation
        - Metadata setup
        - Welcome email
        """
        temp_password = self._generate_temp_password()

        try:
            # Create user in Supabase Auth
            auth_res = self.supabase.auth.sign_up({
                "email": email,
                "password": temp_password,
                "options": {
                    "email_redirect_to": f"{self.frontend_url}/confirm-email.html",
                    "data": {
                        "full_name": full_name,
                        "mobile": mobile,
                        "location": location,
                        "role": role,
                        "onboarded": False,
                        "password_set": False,
                        **({"company_id": company_id} if company_id else {}),
                        **({"company_name": company_name} if company_name else {}),
                    }
                }
            })

            user = getattr(auth_res, "user", None)
            if not user:
                raise ValueError("Failed to create user in Supabase")

            # Recruiter-specific company creation
            final_company_id = self._handle_recruiter_company_creation(
                user_id=user.id,
                role=role,
                company_id=company_id,
                company_name=company_name
            )

            # Send welcome email
            self._send_welcome_email(email, full_name, role, final_company_id)

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
    # PASSWORD UPDATE
    # ---------------------------------------------------------
    def update_password(self, user: dict, new_password: str) -> None:
        """
        Update user password + metadata.
        """
        try:
            user_id = user["id"]

            # Update password
            self.supabase.auth.admin.update_user_by_id(
                user_id=user_id,
                attributes={"password": new_password}
            )

            # Update metadata
            self.supabase.auth.admin.update_user_by_id(
                user_id=user_id,
                attributes={
                    "user_metadata": {
                        **user.get("user_metadata", {}),
                        "password_set": True,
                        "onboarded": True
                    }
                }
            )

            # Send notification email
            self.notify_password_changed(
                email=user.get("email"),
                full_name=user.get("user_metadata", {}).get("full_name")
            )

            logger.info("Password updated", extra={"user_id": user_id})

        except Exception as e:
            logger.error(f"Password update failed: {str(e)}", extra={"user_id": user.get('id')})
            raise RuntimeError("Failed to update password")

    # ---------------------------------------------------------
    # PASSWORD RESET EMAIL
    # ---------------------------------------------------------
    def send_password_reset(self, email: str) -> None:
        """
        Trigger Supabase password reset email.
        """
        try:
            redirect_to = f"{self.frontend_url}/update-password.html"

            self.supabase.auth.reset_password_email(email, {"redirect_to": redirect_to})

            logger.info("Password reset email sent", extra={"email": email})

        except Exception as e:
            logger.error(f"Password reset failed: {str(e)}", extra={"email": email})
            raise RuntimeError("Failed to send password reset email")

    # ---------------------------------------------------------
    # PRIVATE HELPERS
    # ---------------------------------------------------------
    def _generate_temp_password(self) -> str:
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(32))

    def _handle_recruiter_company_creation(
        self,
        user_id: str,
        role: str,
        company_id: Optional[str],
        company_name: Optional[str]
    ) -> Optional[str]:
        """
        Create company for recruiter if needed.
        """
        if role != "recruiter":
            return company_id

        if company_id:
            return company_id

        if not company_name:
            return None

        try:
            generated_id = self._generate_company_id(company_name)

            res = self.supabase.table("companies").insert({
                "id": generated_id,
                "name": company_name,
                "created_by": user_id,
            }).execute()

            if getattr(res, "error", None):
                raise Exception(res.error)

            # Update metadata
            self.supabase.auth.admin.update_user_by_id(user_id, {
                "user_metadata": {
                    "role": "recruiter",
                    "company_id": generated_id,
                    "company_name": company_name,
                    "onboarded": False,
                    "password_set": False,
                }
            })

            return generated_id

        except Exception as e:
            logger.error(f"Company creation failed: {str(e)}", extra={"user_id": user_id})
            return None

    def _generate_company_id(self, name: str) -> str:
        base = ''.join(ch for ch in name if ch.isalpha()).upper()
        if len(base) < 8:
            base += ''.join(secrets.choice(string.ascii_uppercase) for _ in range(8 - len(base)))
        return base[:8]

    # ---------------------------------------------------------
    # EMAILS
    # ---------------------------------------------------------
    def _send_welcome_email(self, email: str, full_name: str, role: str, company_id: Optional[str]) -> None:
        """
        Send welcome email after registration.
        """
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Skreenit, {full_name}!</h2>
            <p>Thank you for registering as a {role}.</p>
            {f'<p>Your Company ID: <strong>{company_id}</strong></p>' if role == 'recruiter' and company_id else ''}
            <p>Please check your email to confirm your account.</p>
        </div>
        """

        try:
            send_email(
                to=email,
                subject="Welcome to Skreenit",
                html=html,
                email_type="welcome"
            )
        except Exception as e:
            logger.error(f"Welcome email failed: {str(e)}", extra={"email": email})

    def notify_password_changed(self, email: str, full_name: Optional[str]) -> None:
        """
        Send password change notification email.
        """
        name = full_name or email.split("@")[0]

        html = f"""
        <div>
          <p>Hi {name},</p>
          <p>Your Skreenit password was updated successfully.</p>
        </div>
        """

        try:
            send_email(
                to=email,
                subject="Your Skreenit Password Was Updated",
                html=html,
                email_type="info"
            )
        except Exception as e:
            logger.error(f"Password change email failed: {str(e)}", extra={"email": email})
