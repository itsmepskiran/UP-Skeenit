from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional


# ---------------------------------------------------------
# LOGIN REQUEST
# ---------------------------------------------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# FORGOT PASSWORD REQUEST
# ---------------------------------------------------------
class PasswordResetRequest(BaseModel):
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# PASSWORD CHANGED NOTIFICATION (Optional)
# ---------------------------------------------------------
class PasswordChangedRequest(BaseModel):
    email: EmailStr
    fullname: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
