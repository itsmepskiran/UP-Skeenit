from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from enum import Enum


# ---------------------------------------------------------
# APPLICATION STATUS ENUM
# ---------------------------------------------------------
class ApplicationStatus(str, Enum):
    submitted = "submitted"
    under_review = "under_review"
    video_pending = "video_pending"
    video_completed = "video_completed"
    interview_scheduled = "interview_scheduled"
    rejected = "rejected"
    hired = "hired"


# ---------------------------------------------------------
# JOB APPLICATION REQUEST
# ---------------------------------------------------------
class ApplicationRequest(BaseModel):
    job_id: str
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    ai_score: Optional[int] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    recruiter_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# CANDIDATE PROFILE REQUEST
# ---------------------------------------------------------
class CandidateProfileRequest(BaseModel):
    title: Optional[str] = None
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    current_salary: Optional[int] = None
    expected_salary: Optional[int] = None
    currency: Optional[str] = "INR"
    resume_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    availability: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# CANDIDATE SKILLS
# ---------------------------------------------------------
class CandidateSkillRequest(BaseModel):
    skill_name: str
    proficiency_level: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# CANDIDATE EDUCATION
# ---------------------------------------------------------
class CandidateEducationRequest(BaseModel):
    degree: str
    institution: str
    year_completed: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# CANDIDATE EXPERIENCE
# ---------------------------------------------------------
class CandidateExperienceRequest(BaseModel):
    title: str
    company: str
    start_year: int
    end_year: Optional[int] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# APPLICATION DETAIL RESPONSE
# ---------------------------------------------------------
class ApplicationDetailResponse(BaseModel):
    id: str
    job_id: str
    candidate_id: str
    status: ApplicationStatus
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    ai_score: Optional[int] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    recruiter_notes: Optional[str] = None
    applied_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# SAVE DRAFT
# ---------------------------------------------------------
class DraftSaveRequest(BaseModel):
    draft: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# EDUCATION ITEM FOR DETAILED FORM
# ---------------------------------------------------------
class EducationItem(BaseModel):
    degree: str
    institution: str
    year: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# EXPERIENCE ITEM FOR DETAILED FORM
# ---------------------------------------------------------
class ExperienceItem(BaseModel):
    company: str
    role: str
    duration: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# DETAILED FORM REQUEST
# ---------------------------------------------------------
class DetailedFormRequest(BaseModel):
    profile: Dict[str, Any]
    education: List[EducationItem]
    experience: List[ExperienceItem]
    skills: List[str]

    model_config = ConfigDict(from_attributes=True)
