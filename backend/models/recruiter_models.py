from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from enum import Enum


class JobStatus(str, Enum):
    draft = "draft"
    active = "active"
    paused = "paused"
    closed = "closed"


class JobPostRequest(BaseModel):
    title: str
    description: str
    requirements: str
    responsibilities: Optional[str] = None
    department: Optional[str] = None
    location: str
    job_type: str
    experience_level: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = "INR"
    status: Optional[JobStatus] = JobStatus.draft
    company_id: Optional[str] = None  # recruiter service will fill this
    expires_at: Optional[str] = None  # ISO date/time

    model_config = ConfigDict(from_attributes=True)


class JobSkillRequest(BaseModel):
    job_id: str
    skill_name: str
    is_required: Optional[bool] = False
    proficiency_level: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CompanyRequest(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    location: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InterviewQuestionRequest(BaseModel):
    job_id: str
    question_text: str
    question_order: int
    time_limit: Optional[int] = 120  # seconds

    model_config = ConfigDict(from_attributes=True)


class RecruiterProfileRequest(BaseModel):
    user_id: str
    company_id: Optional[str] = None
    fullname: str
    email: str
    phone: Optional[str] = None
    position: Optional[str] = None
    linkedin_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CandidateApplicationResponse(BaseModel):
    candidate: Optional[Dict] = None
    application: Optional[Dict] = None

    model_config = ConfigDict(from_attributes=True)


class JobResponse(BaseModel):
    id: str
    title: str
    description: str
    requirements: str
    responsibilities: Optional[str] = None
    department: Optional[str] = None
    location: str
    job_type: str
    experience_level: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = None
    status: JobStatus
    company_id: str
    created_by: str
    expires_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
