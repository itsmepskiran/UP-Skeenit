from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional


# ---------------------------------------------------------
# JOB ITEM FOR DASHBOARD
# ---------------------------------------------------------
class DashboardJob(BaseModel):
    id: str
    title: str
    status: Optional[str] = None
    created_at: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# APPLICATION ITEM FOR DASHBOARD
# ---------------------------------------------------------
class DashboardApplication(BaseModel):
    id: str
    status: Optional[str] = None
    ai_score: Optional[int] = None
    candidate_id: Optional[str] = None
    job_id: Optional[str] = None
    applied_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# DASHBOARD SUMMARY (MAIN RESPONSE MODEL)
# ---------------------------------------------------------
class DashboardSummary(BaseModel):
    role: str
    jobs: List[DashboardJob] = Field(default_factory=list)
    applications: List[DashboardApplication] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
