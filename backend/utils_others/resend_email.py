import os
import logging
from typing import List, Union, Optional

class EmailError(Exception):
    """Custom exception for email sending errors."""
    pass

def send_email(
    to: Union[str, List[str]],
    subject: str,
    html: str,
    from_addr: Optional[str] = None,
    email_type: str = "default",
    reply_to: Optional[str] = None
) -> dict:
    """
    Utility to send email via the Resend API.
    Raises EmailError on failure.
    """

    # -----------------------------------------
    # Import Resend
    # -----------------------------------------
    try:
        import resend
    except Exception as e:
        raise EmailError(f"Resend import failed: {e}")

    # -----------------------------------------
    # API Key
    # -----------------------------------------
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        raise EmailError("Missing RESEND_API_KEY")

    resend.api_key = api_key

    # -----------------------------------------
    # Normalize recipients
    # -----------------------------------------
    if isinstance(to, str):
        to = [to]

    if not to:
        raise EmailError("Recipient list cannot be empty")

    # -----------------------------------------
    # Determine sender address
    # -----------------------------------------
    if from_addr is None:
        email_senders = {
            "welcome": os.getenv("EMAIL_WELCOME", "welcome@skreenit.com"),
            "verification": os.getenv("EMAIL_VERIFICATION", "verification@skreenit.com"),
            "info": os.getenv("EMAIL_INFO", "info@skreenit.com"),
            "support": os.getenv("EMAIL_SUPPORT", "support@skreenit.com"),
            "noreply": os.getenv("EMAIL_NOREPLY", "do-not-reply@skreenit.com"),
            "default": os.getenv("EMAIL_FROM", "info@skreenit.com"),
        }
        from_addr = email_senders.get(email_type, email_senders["default"])

    # -----------------------------------------
    # Prepare payload
    # -----------------------------------------
    payload = {
        "from": from_addr,
        "to": to,
        "subject": subject,
        "html": html,
        "text": "This is an HTML email. Please enable HTML view.",  # fallback
    }

    if reply_to:
        payload["reply_to"] = reply_to

    # -----------------------------------------
    # Send email
    # -----------------------------------------
    try:
        response = resend.Emails.send(payload)

        # Normalize response
        if isinstance(response, dict):
            return response
        if hasattr(response, "__dict__"):
            return response.__dict__

        return {"status": "sent", "raw": str(response)}

    except Exception as e:
        logging.error(f"Email sending failed: {e}")
        raise EmailError(str(e))
