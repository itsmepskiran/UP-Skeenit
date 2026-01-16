from pydantic import BaseModel, EmailStr
from pydantic import ConfigDict
from typing import Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    model_config = ConfigDict(from_attributes=True)


class PasswordResetRequest(BaseModel):
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)


class PasswordChangedRequest(BaseModel):
    email: EmailStr
    fullname: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
