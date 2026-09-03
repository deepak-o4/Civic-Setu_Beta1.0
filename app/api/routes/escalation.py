import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_db
from app.models.complaint import Complaint, ComplaintStatus, PriorityEnum
from app.models.complaint_update import ComplaintUpdate
from app.models.escalation import Escalation
from app.models.user import User, RoleEnum
from app.engines.routing import RoutingEngine
from app.services.notification.service import notification_background_job

logger = logging.getLogger(__name__)
router = APIRouter()

def get_sla_timedelta(priority: PriorityEnum) -> timedelta:
    if priority == PriorityEnum.CRITICAL:
        return timedelta(hours=24)
    elif priority == PriorityEnum.HIGH:
        return timedelta(days=3)
    elif priority == PriorityEnum.MEDIUM:
        return timedelta(days=5)
    else:
        return timedelta(days=7)

async def run_escalation_check(db: AsyncSession) -> int:
    """
    Core escalation logic: Checks all active complaints and escalates them 
    to the department head if their SLA threshold has been exceeded.
    """
    active_statuses = [
        ComplaintStatus.SUBMITTED,
        ComplaintStatus.ASSIGNED,
        ComplaintStatus.PROCESSING
    ]
    query = select(Complaint).filter(Complaint.status.in_(active_statuses))
    result = await db.execute(query)
    complaints = result.scalars().all()

    escalated_count = 0
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    for complaint in complaints:
        sla_limit = get_sla_timedelta(complaint.priority)
        age = now - complaint.created_at

        if age > sla_limit:
            head_query = select(User).filter(
                User.role == RoleEnum.HEAD,
                User.department == complaint.department,
                User.is_deleted == False
            ).order_by(User.id.asc()).limit(1)
            
            head_result = await db.execute(head_query)
            head = head_result.scalars().first()
            
            if head:
                old_assigned_to = complaint.assigned_to
                complaint.assigned_to = head.id
                complaint.status = ComplaintStatus.ESCALATED
                
                escalation = Escalation(
                    complaint_id=complaint.id,
                    escalated_by=old_assigned_to,
                    escalated_to=head.id,
                    reason=f"Auto-escalated due to SLA breach. Age: {age.days}d {age.seconds // 3600}h. SLA: {sla_limit.days}d {sla_limit.seconds // 3600}h."
                )
                db.add(escalation)
                
                update = ComplaintUpdate(
                    complaint_id=complaint.id,
                    status=ComplaintStatus.ESCALATED.value,
                    note="Auto-escalated by system due to SLA breach.",
                    updated_by=None
                )
                db.add(update)
                
                # Notify citizen of status escalation
                try:
                    citizen_query = select(User).filter(User.email == complaint.citizen_email)
                    citizen_res = await db.execute(citizen_query)
                    citizen_user = citizen_res.scalars().first()
                    if citizen_user:
                        await notification_background_job(
                            user_id=citizen_user.id,
                            message=f"The status of complaint ticket {complaint.ticket_id} has changed to ESCALATED.",
                            subject=f"Grievance Status Update - Ticket {complaint.ticket_id}"
                        )
                        try:
                            from app.api.socket import sio
                            await sio.emit("statusUpdated", {
                                "ticket_id": complaint.ticket_id,
                                "status": "ESCALATED"
                            }, room=str(citizen_user.id))
                        except Exception as sio_err:
                            logger.error(f"Failed to emit statusUpdated socket event: {sio_err}")
                except Exception as citizen_notif_err:
                    logger.error(f"Failed to notify citizen of escalation: {citizen_notif_err}")

                # Notify department head of assignment
                try:
                    await notification_background_job(
                        user_id=head.id,
                        message=f"Complaint ticket {complaint.ticket_id} has been escalated to you due to resolution delay.",
                        subject=f"Urgent Grievance Escalation - Ticket {complaint.ticket_id}"
                    )
                except Exception as head_notif_err:
                    logger.error(f"Failed to notify department head of escalation: {head_notif_err}")

                escalated_count += 1

    await db.commit()
    return escalated_count

@router.post("/run", status_code=status.HTTP_200_OK)
async def auto_escalate_delayed_complaints(db: AsyncSession = Depends(get_db)):
    """
    Manually triggers the escalation check for testing purposes.
    """
    escalated_count = await run_escalation_check(db)
    return {"msg": "Escalation run completed", "escalated_count": escalated_count}
