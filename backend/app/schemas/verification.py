from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any

class FileResponse(BaseModel):
    id: int
    file_name: str
    file_type: str
    
    model_config = ConfigDict(from_attributes=True)

class VerificationResponse(BaseModel):
    id: int
    user_id: int
    industry: str
    verification_type: str
    description: Optional[str] = None
    status: str
    confidence_score: int
    explanation: Optional[str] = None
    checklist: Optional[Any] = None
    timeline: Optional[Any] = None
    recommendations: Optional[Any] = None
    retrieved_context: Optional[Any] = None
    created_at: datetime
    files: List[FileResponse] = []
    
    model_config = ConfigDict(from_attributes=True)

class VerificationSummary(BaseModel):
    id: int
    industry: str
    verification_type: str
    status: str
    confidence_score: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
