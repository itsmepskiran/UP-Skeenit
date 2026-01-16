from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict
from enum import Enum


class ApplicationStatus(str, Enum):
    submitted = "submitted"
    under_review = "under_review"
    video_pending = "video_pending"
    video_completed = "video_completed"
    interview_scheduled = "interview_scheduled"
    rejected = "rejected"
    hired = "hired"


class ApplicationRequest(BaseModel):
    job_id: str
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    ai_score: Optional[int] = None
    ai_analysis: Optional[Dict] = None
    recruiter_notes: Optional[str] = None

    # candidate_id + status are filled by backend
    model_config = ConfigDict(from_attributes=True)


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

    # user_id is taken from request.state.user
    model_config = ConfigDict(from_attributes=True)


class CandidateSkillRequest(BaseModel):
    skill_name: str
    proficiency_level: Optional[str] = None

    # candidate_id comes from backend
    model_config = ConfigDict(from_attributes=True)


class CandidateEducationRequest(BaseModel):
    degree: str
    institution: str
    year_completed: Optional[int] = None

    # candidate_id comes from backend
    model_config = ConfigDict(from_attributes=True)


class CandidateExperienceRequest(BaseModel):
    title: str
    company: str
    start_year: int
    end_year: Optional[int] = None
    description: Optional[str] = None

    # candidate_id comes from backend
    model_config = ConfigDict(from_attributes=True)


class ApplicationDetailResponse(BaseModel):
    id: str
    job_id: str
    candidate_id: str
    status: ApplicationStatus
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    ai_score: Optional[int] = None
    ai_analysis: Optional[Dict] = None
    recruiter_notes: Optional[str] = None
    applied_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
