import os
import httpx
import logging
from typing import Optional, Dict, Any
from supabase import Client
from services.supabase_client import get_client
from utils_others.resend_email import send_email

logging.basicConfig(level=logging.INFO)

class AuthService:
    def __init__(self, client: Optional[Client] = None) -> None:
        self.supabase = client or get_client()
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    def login(self, email: str, password: str) -> Dict[str, Any]:
        res = self.supabase.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
        if not getattr(res, "session", None):
            raise ValueError("Invalid credentials")
        session = getattr(res, "session", None)
        if not session:
            raise ValueError("No session found in login response")
        return {"ok": True, "data": {"access_token": session.access_token, "user": getattr(res, "user", None)}}

    def validate_token(self, bearer_token: str) -> Dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {bearer_token}",
            "apikey": self.service_key or "",
        }
        resp = httpx.get(f"{self.supabase_url}/auth/v1/user", headers=headers)
        resp.raise_for_status()
        return {"user": resp.json()}

    def register(self,
                 full_name: str,
                 email: str,
                 mobile: str,
                 location: str,
                 role: str,
                 company_id: Optional[str] = None,
                 company_name: Optional[str] = None,
                 resume_bytes: Optional[bytes] = None,
                 resume_filename: Optional[str] = None) -> Dict[str, Any]:
        # Generate a strong random password (won't be used, just a placeholder)
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(32))
        
        # Configure the redirect URL for email confirmation
        site_url = os.getenv("FRONTEND_BASE_URL", "https://login.skreenit.com")
        redirect_to = f"{site_url}/update-password.html"
        
        try:
            # Sign up the user with email confirmation
            auth_res = self.supabase.auth.sign_up({
                "email": email,
                "password": temp_password,
                "options": {
                    "email_redirect_to": redirect_to,
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
                
            # Handle resume upload if provided
            resume_path = None
            if resume_bytes and resume_filename:
                try:
                    import time
                    ts = int(time.time() * 1000)
                    safe_name = resume_filename.replace(" ", "_")
                    resume_path = f"{user.id}/{ts}-{safe_name}"
                    up = self.supabase.storage.from_("resumes").upload(resume_path, resume_bytes)
                    if getattr(up, "error", None):
                        resume_path = None
                except Exception as e:
                    logging.error(f"Failed to upload resume: {str(e)}")
                    resume_path = None
            
            # Handle company creation for recruiters
            final_company_id = company_id
            if role == "recruiter" and (not final_company_id) and company_name:
                import random
                import string
                base = ''.join(ch for ch in (company_name or "") if ch.isalpha()).upper()
                if len(base) < 8:
                    base = base + ''.join(random.choice(string.ascii_uppercase) for _ in range(8 - len(base)))
                gen_id = base[:8]
                try:
                    comp_ins = self.supabase.table("companies").insert({
                        "id": gen_id,
                        "name": company_name,
                        "created_by": user.id,
                    }).execute()
                    if getattr(comp_ins, "error", None):
                        raise Exception(str(comp_ins.error))
                    final_company_id = gen_id
                    
                    # Update user metadata with company info
                    try:
                        self.supabase.auth.admin.update_user_by_id(user.id, {
                            "user_metadata": {
                                "role": "recruiter",
                                "company_id": final_company_id,
                                "company_name": company_name,
                                "onboarded": False,
                                "password_set": False,
                            }
                        })
                    except Exception as e:
                        logging.error(f"Failed to update user metadata: {str(e)}")
                        
                except Exception as e:
                    logging.error(f"Failed to create company: {str(e)}")
                    final_company_id = None
            
            # Send welcome email
            self._send_welcome_email(email, full_name, role, final_company_id)
            
            return {
                "ok": True,
                "user_id": user.id,
                "email": email,
                "company_id": final_company_id,
                "resume_path": resume_path
            }
            
        except Exception as e:
            error_msg = str(e).lower()
            if "already registered" in error_msg or "already exists" in error_msg:
                raise ValueError("This email is already registered")
            raise RuntimeError(f"Registration failed: {str(e)}")

    def _send_welcome_email(self, email: str, full_name: str, role: str, company_id: Optional[str] = None) -> Dict[str, Any]:
        """Send welcome email with instructions"""
        site_url = os.getenv("FRONTEND_BASE_URL", "https://login.skreenit.com")
        
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Skreenit, {full_name}!</h2>
            <p>Thank you for registering as a {role} on our platform.</p>
            {f'<p>Your Company ID: <strong>{company_id}</strong></p>' if role == 'recruiter' and company_id else ''}
            <p>Please check your email for a confirmation link to activate your account and set your password.</p>
            <p>If you didn't receive the email, please check your spam folder.</p>
            <p>Once your account is activated, you can log in at:</p>
            <p><a href="{site_url}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Go to Login</a></p>
            <p>Best regards,<br>The Skreenit Team</p>
        </div>
        """
        
        try:
            send_email(
                to=email,
                subject="Welcome to Skreenit - Confirm Your Email",
                html=html,
                email_type="welcome"
            )
            return {
                "ok": True,
                "email_sent": True,
                "message": "Welcome email sent successfully"
            }
        except Exception as e:
            logging.error(f"Failed to send welcome email to {email}: {str(e)}")
            return {
                "ok": False,
                "email_sent": False,
                "error": str(e)
            }

    def notify_password_changed(self, email: str, full_name: Optional[str] = None) -> Dict[str, Any]:
        display_name = full_name or (email.split("@")[0])
        html = f"""
        <div>
          <p>Hi {display_name},</p>
          <p>Your Skreenit account password was updated successfully.</p>
          <p>If you did not initiate this change, please contact support immediately.</p>
          <p><b>Regards,</b><br/>Team Skreenit</p>
        </div>
        """
        try:
            res = send_email(to=email, subject="Skreenit Password Updated", html=html, email_type="info")
            return {"email_sent": True, "response": res}
        except Exception as e:
            return {"email_sent": False, "error": str(e)}

    def get_recruiter_company_info(self, user_id: str) -> Dict[str, Any]:
        prof = self.supabase.table("recruiter_profiles").select("company_id").eq("user_id", user_id).single().execute()
        company_id = None
        if getattr(prof, "data", None) and prof.data:
            company_id = prof.data.get("company_id")
        if not company_id:
            try:
                user = self.supabase.auth.admin.get_user_by_id(user_id)
                user_obj = getattr(user, "user", None)
                meta = getattr(user_obj, "user_metadata", {}) if user_obj else {}
                company_id = meta.get("company_id") if isinstance(meta, dict) else None
            except Exception:
                company_id = None
        if not company_id:
            return {"company_id": None, "company_name": None}
        comp = self.supabase.table("companies").select("id,name").eq("id", company_id).single().execute()
        name = comp.data.get("name") if getattr(comp, "data", None) else None
        return {"company_id": company_id, "company_name": name}

    def send_recruiter_company_email(self, email: str, full_name: Optional[str], company_id: str, company_name: Optional[str]) -> Dict[str, Any]:
        cname = company_name or "Your Company"
        html = f"""
        <div>
          <p>Hi {full_name or ''},</p>
          <p>Your recruiter profile has been set up on Skreenit.</p>
          <p><strong>Company Name:</strong> {cname}<br/>
          <strong>Company ID:</strong> {company_id}</p>
          <p>Use this Company ID when logging in as a recruiter.</p>
          <p><b>Regards,</b><br/>Team Skreenit</p>
        </div>
        """
        try:
            res = send_email(to=email, subject="Your Skreenit Company ID", html=html, email_type="info")
            return {"email_sent": True, "response": res}
        except Exception as e:
            return {"email_sent": False, "error": str(e)}
