from typing import Generic, Optional, TypeVar, Dict, Any
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


# ---------------------------------------------------------
# STANDARD ERROR RESPONSE
# ---------------------------------------------------------
class ErrorResponse(BaseModel):
    ok: bool = False
    error: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# STANDARD SUCCESS RESPONSE (Generic)
# ---------------------------------------------------------
class StandardResponse(BaseModel, Generic[T]):
    ok: bool = True
    data: Optional[T] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------
# SCORECARD MODEL (Used for AI scoring)
# ---------------------------------------------------------
class ScoreCard(BaseModel):
    communication: int
    appearance: int
    attitude: int
    behaviour: int
    confidence: int
    total: int

    model_config = ConfigDict(from_attributes=True)
