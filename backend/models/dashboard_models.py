from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class DashboardJob(BaseModel):
    id: str
    title: str
    status: Optional[str] = None
    created_at: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DashboardApplication(BaseModel):
    id: str
    status: Optional[str] = None
    ai_score: Optional[int] = None
    candidate_id: Optional[str] = None
    job_id: Optional[str] = None
    applied_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DashboardSummary(BaseModel):
    role: str
    jobs: List[DashboardJob] = []
    applications: List[DashboardApplication] = []

    model_config = ConfigDict(from_attributes=True)
