from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import case
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, require_role, Admin, Officer, Head
from app.models.complaint import Complaint, ComplaintStatus, PriorityEnum, ComplaintRecordType
from app.models.complaint_update import ComplaintUpdate
from app.services.storage.attachment import AttachmentService
from app.schemas.complaint import Complaint as ComplaintSchema, ComplaintFullDetailResponse
from app.services.complaint_tracking import ComplaintTrackingService
from app.models.user import User
from app.services.notification.service import NotificationService

router = APIRouter()

# These endpoints originally accepted Admin only. Per product decision, Officer
# and Head now get full feature parity with Admin (same dashboard, analytics,
# and priority-override capability) rather than a scoped-down view — so every
# route below accepts all three staff roles.
STAFF = [Admin, Officer, Head]

class StatusUpdateRequest(BaseModel):
    status: str
    note: str = None
    assigned_to: str = None

class PriorityUpdateRequest(BaseModel):
    priority: str
    note: Optional[str] = None

@router.get("/complaints/heatmap")
async def get_complaints_heatmap(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(STAFF))
):
    """
    Returns geo-tagged complaint points for the city heatmap, weighted by priority
    so admins can visually spot both high-volume AND high-severity hotspots.
    """
    query = select(Complaint).filter(
        Complaint.lat.isnot(None),
        Complaint.lon.isnot(None)
    )
    result = await db.execute(query)
    complaints = result.scalars().all()

    weight_map = {"LOW": 0.25, "MEDIUM": 0.5, "HIGH": 0.75, "CRITICAL": 1.0}

    points = []
    district_breakdown = {}
    for c in complaints:
        priority_val = c.priority.value if hasattr(c.priority, "value") else c.priority
        status_val = c.status.value if hasattr(c.status, "value") else c.status
        weight = weight_map.get(priority_val, 0.5)

        points.append({
            "lat": c.lat,
            "lng": c.lon,
            "weight": weight,
            "priority": priority_val,
            "status": status_val,
            "category": c.category,
            "district": c.district,
            "ticket_id": c.ticket_id,
            "title": c.title,
        })

        d = district_breakdown.setdefault(c.district, {"total": 0, "critical": 0, "high": 0})
        d["total"] += 1
        if priority_val == "CRITICAL":
            d["critical"] += 1
        elif priority_val == "HIGH":
            d["high"] += 1

    return {
        "points": points,
        "count": len(points),
        "district_breakdown": district_breakdown,
    }


@router.get("/complaints", response_model=List[ComplaintSchema])
async def get_all_complaints(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(STAFF))
):
    # Live complaints (submitted directly through CivicSetu) come first as a
    # whole group, ahead of imported historical BBMP records — citizens'
    # active complaints shouldn't get buried under a bulk historical import.
    # Within each group (live, then historical), highest-priority complaints
    # come first (CRITICAL > HIGH > MEDIUM > LOW), then by the AI's numeric
    # priority_score (also highest first) as a tiebreaker within the same
    # band, then newest-first for anything left exactly tied.
    live_rank = case(
        (Complaint.record_type == ComplaintRecordType.LIVE, 1),
        else_=0,
    )
    priority_rank = case(
        (Complaint.priority == PriorityEnum.CRITICAL, 4),
        (Complaint.priority == PriorityEnum.HIGH, 3),
        (Complaint.priority == PriorityEnum.MEDIUM, 2),
        (Complaint.priority == PriorityEnum.LOW, 1),
        else_=0,
    )
    query = select(Complaint).order_by(
        live_rank.desc(),
        priority_rank.desc(),
        Complaint.priority_score.desc().nulls_last(),
        Complaint.created_at.desc(),
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/complaints/{ticket_id}", response_model=ComplaintFullDetailResponse)
async def get_complaint_full_detail(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(STAFF))
):
    """
    Full complaint detail for the admin dashboard — citizen contact info,
    pinned location, AI priority breakdown, attachments, and status timeline.
    """
    data = await ComplaintTrackingService.get_tracking_data(ticket_id, db, include_pii=True)
    if not data:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return data

@router.patch("/complaints/{ticket_id}")
async def update_complaint_status(
    ticket_id: str,
    payload: StatusUpdateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(STAFF))
):
    status_str = payload.status.upper()
    if status_str == "IN_PROGRESS":
        status_str = "PROCESSING"
    elif status_str == "REJECTED":
        status_str = "CLOSED"

    try:
        new_status = ComplaintStatus(status_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    query = select(Complaint).filter(Complaint.ticket_id == ticket_id)
    result = await db.execute(query)
    complaint = result.scalars().first()

    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_status = complaint.status
    old_assigned_to = complaint.assigned_to

    complaint.status = new_status

    assigned_changed = False
    if payload.assigned_to is not None:
        if payload.assigned_to == "":
            new_assigned_to = None
        else:
            try:
                import uuid
                new_assigned_to = uuid.UUID(payload.assigned_to)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid assigned_to UUID")
        
        if old_assigned_to != new_assigned_to:
            complaint.assigned_to = new_assigned_to
            assigned_changed = True

    db_update = ComplaintUpdate(
        complaint_id=complaint.id,
        status=new_status.value,
        note=payload.note or "Status updated by admin.",
        updated_by=current_user.id
    )
    db.add(db_update)
    await db.commit()

    try:
        query_user = select(User).filter(User.email == complaint.citizen_email)
        user_res = await db.execute(query_user)
        citizen_user = user_res.scalars().first()
        
        if citizen_user:
            from app.api.socket import sio
            await sio.emit("statusUpdated", {
                "ticket_id": ticket_id,
                "status": new_status.value
            }, room=str(citizen_user.id))
            
            # Dispatch citizen notification on status change
            if new_status != old_status:
                if new_status == ComplaintStatus.RESOLVED:
                    NotificationService.dispatch_resolved_notification(
                        user_id=citizen_user.id,
                        ticket_id=ticket_id,
                        background_tasks=background_tasks
                    )
                else:
                    NotificationService.dispatch_status_changed_notification(
                        user_id=citizen_user.id,
                        ticket_id=ticket_id,
                        new_status=new_status.value,
                        background_tasks=background_tasks
                    )
    except Exception as e:
        print(f"Failed to emit statusUpdated or dispatch status notifications: {e}")

    # Dispatch assignment notification to the assigned officer
    if assigned_changed and complaint.assigned_to is not None:
        try:
            NotificationService.dispatch_assigned_notification(
                user_id=complaint.assigned_to,
                ticket_id=ticket_id,
                background_tasks=background_tasks
            )
        except Exception as e:
            print(f"Failed to dispatch assignment notification: {e}")

    return {"msg": "Status updated successfully", "status": new_status.value}

@router.patch("/complaints/{ticket_id}/priority")
async def update_complaint_priority(
    ticket_id: str,
    payload: PriorityUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(STAFF))
):
    """
    Lets an admin manually override the AI-assigned priority after reviewing
    a complaint themselves. The AI's original score/breakdown is preserved
    (untouched) inside priority_breakdown; this only records the override as
    an additional entry there and updates the effective priority band used
    for sorting and display everywhere else in the app.
    """
    try:
        new_priority = PriorityEnum(payload.priority.upper())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid priority: {payload.priority}. Must be one of LOW, MEDIUM, HIGH, CRITICAL."
        )

    query = select(Complaint).filter(Complaint.ticket_id == ticket_id)
    result = await db.execute(query)
    complaint = result.scalars().first()

    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_priority = complaint.priority
    old_priority_val = old_priority.value if hasattr(old_priority, "value") else old_priority

    if old_priority_val == new_priority.value:
        return {"msg": "Priority unchanged", "priority": new_priority.value}

    complaint.priority = new_priority

    breakdown = dict(complaint.priority_breakdown or {})
    breakdown["manual_override"] = {
        "overridden_by": str(current_user.id),
        "overridden_by_name": current_user.name,
        "previous_priority": old_priority_val,
        "new_priority": new_priority.value,
        "note": payload.note,
        "overridden_at": datetime.utcnow().isoformat(),
    }
    complaint.priority_breakdown = breakdown

    status_val = complaint.status.value if hasattr(complaint.status, "value") else complaint.status
    db_update = ComplaintUpdate(
        complaint_id=complaint.id,
        status=status_val,
        note=payload.note or f"Priority manually changed from {old_priority_val} to {new_priority.value} by admin.",
        updated_by=current_user.id
    )
    db.add(db_update)
    await db.commit()

    return {"msg": "Priority updated successfully", "priority": new_priority.value}

@router.post("/complaints/{ticket_id}/proof")
async def upload_proof(
    ticket_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(STAFF))
):
    query = select(Complaint).filter(Complaint.ticket_id == ticket_id)
    result = await db.execute(query)
    complaint = result.scalars().first()

    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    attach_rec = await AttachmentService.validate_and_upload(
        file=file,
        complaint_id=complaint.id,
        db=db
    )
    await db.commit()

    return {"msg": "Proof uploaded successfully", "file_url": attach_rec.file_url}
