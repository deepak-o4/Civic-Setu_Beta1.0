import uuid
from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.models.complaint import PriorityEnum, ComplaintStatus

class ComplaintBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    department: str
    district: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    priority: PriorityEnum = PriorityEnum.LOW
    status: ComplaintStatus = ComplaintStatus.SUBMITTED

class CrisisCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    department: str
    district: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    priority: Optional[PriorityEnum] = PriorityEnum.LOW
    status: Optional[ComplaintStatus] = ComplaintStatus.SUBMITTED

class CrisisUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    district: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    priority: Optional[PriorityEnum] = None
    status: Optional[ComplaintStatus] = None

class Complaint(ComplaintBase):
    id: uuid.UUID
    ticket_id: str
    citizen_name: Optional[str] = None
    citizen_email: Optional[str] = None
    citizen_phone: Optional[str] = None
    # CivicSetu Priority Engine: explainable score + component breakdown.
    priority_score: Optional[float] = None
    priority_breakdown: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ComplaintSubmissionResponse(BaseModel):
    ticket_id: str
    status: str
    estimated_sla: str

class ComplaintAttachmentSchema(BaseModel):
    file_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TimelineEventSchema(BaseModel):
    status: str
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ComplaintTrackingResponse(BaseModel):
    ticket_id: str
    status: ComplaintStatus
    priority: PriorityEnum
    priority_score: Optional[float] = None
    priority_breakdown: Optional[Dict[str, Any]] = None
    category: str
    department: str
    district: str
    title: str
    description: Optional[str] = None
    assigned_officer: Optional[str] = None
    assigned_to: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    attachments: List[ComplaintAttachmentSchema] = []
    timeline: List[TimelineEventSchema] = []

    model_config = ConfigDict(from_attributes=True)

class ComplaintFullDetailResponse(ComplaintTrackingResponse):
    """Same as ComplaintTrackingResponse plus citizen contact info and pinned
    location — for authenticated admin/officer/head views only. Never expose
    this on a publicly-reachable-by-ticket-id endpoint."""
    citizen_name: Optional[str] = None
    citizen_email: Optional[str] = None
    citizen_phone: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
