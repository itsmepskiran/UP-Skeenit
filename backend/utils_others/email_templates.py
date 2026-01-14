from typing import Dict, Any
from pathlib import Path
import os
from jinja2 import Environment, FileSystemLoader

class EmailTemplates:
    def __init__(self):
        self.template_dir = Path(__file__).parent / "templates"
        self.template_dir.mkdir(exist_ok=True)

        self.env = Environment(
            loader=FileSystemLoader(str(self.template_dir))
        )

    def registration_confirmation(self, user_data: Dict[str, Any]) -> str:
        template = self.env.get_template("registration_confirmation.html")
        return template.render(
            name=user_data["full_name"],
            role=user_data["role"],
            login_url=os.getenv("FRONTEND_BASE_URL", "https://login.skreenit.com")
        )

    def recruiter_welcome(self, user_data: Dict[str, Any]) -> str:
        template = self.env.get_template("recruiter_welcome.html")
        return template.render(
            name=user_data["full_name"],
            email=user_data["email"],
            company_id=user_data["company_id"],
            login_url=os.getenv("FRONTEND_BASE_URL", "https://login.skreenit.com")
        )

    def password_reset(self, user_data: Dict[str, Any]) -> str:
        template = self.env.get_template("password_reset.html")
        return template.render(
            name=user_data["full_name"],
            reset_url=user_data["reset_url"]
        )

    def password_updated(self, user_data: Dict[str, Any]) -> str:
        template = self.env.get_template("password_updated.html")
        return template.render(
            name=user_data["full_name"],
            login_url=os.getenv("FRONTEND_BASE_URL", "https://login.skreenit.com")
        )


# ---------------------------------------------------------
# Only create templates if they do NOT already exist
# ---------------------------------------------------------
def write_default_templates():
    template_dir = Path(__file__).parent / "templates"
    template_dir.mkdir(exist_ok=True)

    templates = {
        "registration_confirmation.html": """
<!DOCTYPE html>
<html>
<body>
    <h2>Welcome to Skreenit!</h2>
    <p>Dear {{ name }},</p>
    <p>Thank you for registering with Skreenit as a {{ role }}.</p>
    <p>Please click the verification link in your email to confirm your address and set up your password.</p>
    <p>After verification, you can login here:</p>
    <p><a href="{{ login_url }}">{{ login_url }}</a></p>
    <p>Best regards,<br>The Skreenit Team</p>
</body>
</html>
""",
        "recruiter_welcome.html": """
<!DOCTYPE html>
<html>
<body>
    <h2>Welcome to Skreenit!</h2>
    <p>Dear {{ name }},</p>
    <p>Your recruiter account has been created successfully.</p>
    <ul>
        <li><strong>Login Email:</strong> {{ email }}</li>
        <li><strong>Company ID:</strong> {{ company_id }}</li>
    </ul>
    <p>You'll need your Company ID for future logins.</p>
    <p>Please click the verification link in your email to confirm your address and set up your password.</p>
    <p><a href="{{ login_url }}">{{ login_url }}</a></p>
</body>
</html>
""",
        "password_reset.html": """
<!DOCTYPE html>
<html>
<body>
    <h2>Reset Your Password</h2>
    <p>Dear {{ name }},</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="{{ reset_url }}">Reset Password</a></p>
</body>
</html>
""",
        "password_updated.html": """
<!DOCTYPE html>
<html>
<body>
    <h2>Password Updated Successfully</h2>
    <p>Dear {{ name }},</p>
    <p>Your password has been updated successfully.</p>
    <p><a href="{{ login_url }}">{{ login_url }}</a></p>
</body>
</html>
"""
    }

    for filename, content in templates.items():
        file_path = template_dir / filename
        if not file_path.exists():
            with open(file_path, "w") as f:
                f.write(content)


# Run once
write_default_templates()
