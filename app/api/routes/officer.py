from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import case
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, require_role, Officer, Head
from app.models.complaint import Complaint, ComplaintStatus, PriorityEnum, ComplaintRecordType
from app.models.complaint_update import ComplaintUpdate
from app.schemas.complaint import Complaint as ComplaintSchema, ComplaintFullDetailResponse
from app.services.complaint_tracking import ComplaintTrackingService
from app.models.user import User

router = APIRouter()


class OfficerStatusUpdateRequest(BaseModel):
    status: str
    note: Optional[str] = None


class OfficerPriorityUpdateRequest(BaseModel):
    priority: str
    note: Optional[str] = None


def _priority_order():
    # Live complaints (submitted directly through CivicSetu) first as a
    # group, ahead of imported historical BBMP records, then highest-priority
    # complaints first within each group — same ranking used on the admin
    # complaints list, so officers/heads also see urgent tickets at the top
    # instead of just the newest ones.
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
    return [live_rank.desc(), priority_rank.desc(), Complaint.priority_score.desc().nulls_last(), Complaint.created_at.desc()]


def _scope_query_to_user(current_user: User):
    """OFFICER sees only complaints assigned directly to them.
    HEAD sees every complaint in their department (oversight view)."""
    if current_user.role.value == "HEAD":
        return select(Complaint).filter(
            Complaint.department == current_user.department
        ).order_by(*_priority_order())
    return select(Complaint).filter(
        Complaint.assigned_to == current_user.id
    ).order_by(*_priority_order())


def _assert_can_access(current_user: User, complaint: Complaint):
    if current_user.role.value == "OFFICER" and complaint.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="This complaint is not assigned to you.")
    if current_user.role.value == "HEAD" and complaint.department != current_user.department:
        raise HTTPException(status_code=403, detail="This complaint is outside your department.")


@router.get("/complaints", response_model=List[ComplaintSchema])
async def get_my_complaints(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([Officer, Head]))
):
    result = await db.execute(_scope_query_to_user(current_user))
    return result.scalars().all()


@router.get("/complaints/heatmap")
async def get_my_complaints_heatmap(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([Officer, Head]))
):
    """
    Geo-tagged points scoped to this officer's/head's own complaint view —
    the same idea as the admin city-wide heatmap, but limited to what they're
    already allowed to see (their own assignments, or their whole department).
    """
    result = await db.execute(_scope_query_to_user(current_user))
    complaints = result.scalars().all()

    weight_map = {"LOW": 0.25, "MEDIUM": 0.5, "HIGH": 0.75, "CRITICAL": 1.0}
    points = []
    district_breakdown = {}

    for c in complaints:
        if c.lat is None or c.lon is None:
            continue
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

    return {"points": points, "count": len(points), "district_breakdown": district_breakdown}


@router.get("/complaints/summary")
async def get_my_complaints_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([Officer, Head]))
):
    result = await db.execute(_scope_query_to_user(current_user))
    complaints = result.scalars().all()

    summary = {"total": len(complaints), "by_status": {}, "by_priority": {}}
    for c in complaints:
        s = c.status.value if hasattr(c.status, "value") else c.status
        p = c.priority.value if hasattr(c.priority, "value") else c.priority
        summary["by_status"][s] = summary["by_status"].get(s, 0) + 1
        summary["by_priority"][p] = summary["by_priority"].get(p, 0) + 1

    return summary


@router.get("/complaints/{ticket_id}", response_model=ComplaintFullDetailResponse)
async def get_my_complaint_detail(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([Officer, Head]))
):
    result = await db.execute(select(Complaint).filter(Complaint.ticket_id == ticket_id))
    complaint = result.scalars().first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    _assert_can_access(current_user, complaint)

    data = await ComplaintTrackingService.get_tracking_data(ticket_id, db, include_pii=True)
    if not data:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return data


@router.patch("/complaints/{ticket_id}")
async def update_my_complaint_status(
    ticket_id: str,
    payload: OfficerStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([Officer, Head]))
):
    status_str = payload.status.upper()
    if status_str == "IN_PROGRESS":
        status_str = "PROCESSING"

    try:
        new_status = ComplaintStatus(status_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    result = await db.execute(select(Complaint).filter(Complaint.ticket_id == ticket_id))
    complaint = result.scalars().first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    _assert_can_access(current_user, complaint)

    complaint.status = new_status
    db_update = ComplaintUpdate(
        complaint_id=complaint.id,
        status=new_status.value,
        note=payload.note or f"Status updated by {current_user.role.value.title()} {current_user.name}.",
        updated_by=current_user.id
    )
    db.add(db_update)
    await db.commit()

    return {"msg": "Status updated successfully", "status": new_status.value}


@router.patch("/complaints/{ticket_id}/priority")
async def update_my_complaint_priority(
    ticket_id: str,
    payload: OfficerPriorityUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([Officer, Head]))
):
    """
    Lets an officer or head manually override the AI-assigned priority for a
    complaint they can access (their own assignment for OFFICER, anything in
    their department for HEAD) — the same capability admins have. The AI's
    original score/breakdown is preserved; this records the override as an
    additional entry and updates the effective priority band used for
    sorting/display everywhere.
    """
    try:
        new_priority = PriorityEnum(payload.priority.upper())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid priority: {payload.priority}. Must be one of LOW, MEDIUM, HIGH, CRITICAL."
        )

    result = await db.execute(select(Complaint).filter(Complaint.ticket_id == ticket_id))
    complaint = result.scalars().first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    _assert_can_access(current_user, complaint)

    old_priority = complaint.priority
    old_priority_val = old_priority.value if hasattr(old_priority, "value") else old_priority

    if old_priority_val == new_priority.value:
        return {"msg": "Priority unchanged", "priority": new_priority.value}

    complaint.priority = new_priority

    breakdown = dict(complaint.priority_breakdown or {})
    breakdown["manual_override"] = {
        "overridden_by": str(current_user.id),
        "overridden_by_name": current_user.name,
        "overridden_by_role": current_user.role.value,
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
        note=payload.note or f"Priority manually changed from {old_priority_val} to {new_priority.value} by {current_user.role.value.title()} {current_user.name}.",
        updated_by=current_user.id
    )
    db.add(db_update)
    await db.commit()

    return {"msg": "Priority updated successfully", "priority": new_priority.value}
