from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict
from enum import Enum


# ---------------------------------------------------------
# JOB STATUS ENUM
# ---------------------------------------------------------
class JobStatus(str, Enum):
    draft = "draft"
    active = "active"
    paused = "paused"
    closed = "closed"


# ---------------------------------------------------------
# CREATE JOB (Used by recruiter_router)
# ---------------------------------------------------------
class JobCreateRequest(BaseModel):
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
    expires_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# UPDATE JOB (Used by recruiter_router)
# ---------------------------------------------------------
class JobUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = None
    status: Optional[JobStatus] = None
    expires_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# INTERNAL MODEL (Still used by RecruiterService)
# ---------------------------------------------------------
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
    company_id: Optional[str] = None
    expires_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# JOB SKILLS
# ---------------------------------------------------------
class JobSkillRequest(BaseModel):
    job_id: str
    skill_name: str
    is_required: Optional[bool] = False
    proficiency_level: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# COMPANY DETAILS
# ---------------------------------------------------------
class CompanyRequest(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    location: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# INTERVIEW QUESTIONS
# ---------------------------------------------------------
class InterviewQuestionRequest(BaseModel):
    job_id: str
    question_text: str
    question_order: int
    time_limit: Optional[int] = 120

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# RECRUITER PROFILE UPDATE (Used by recruiter_router)
# ---------------------------------------------------------
class RecruiterProfileUpdate(BaseModel):
    fullname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    linkedin_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# INTERNAL MODEL (Still used by RecruiterService)
# ---------------------------------------------------------
class RecruiterProfileRequest(BaseModel):
    user_id: str
    company_id: Optional[str] = None
    fullname: str
    email: str
    phone: Optional[str] = None
    position: Optional[str] = None
    linkedin_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# APPLICATION RESPONSE
# ---------------------------------------------------------
class CandidateApplicationResponse(BaseModel):
    candidate: Optional[Dict] = None
    application: Optional[Dict] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# JOB RESPONSE
# ---------------------------------------------------------
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
