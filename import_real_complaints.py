"""Import BBMP 2025 grievance records into CivicSetu without changing existing workflows.

Usage:
  python import_real_complaints.py --limit 20000
  python import_real_complaints.py --limit 0   # import all records

The CSV is stored at data/bbmp_grievances_2025.csv.
Imported rows are marked with record_type/data_source and duplicate ticket IDs are skipped.
"""
import argparse, asyncio, csv, re
from datetime import datetime, timezone
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.complaint import Complaint, ComplaintStatus, PriorityEnum, ComplaintRecordType

CSV_PATH = 'data/bbmp_grievances_2025.csv'
SOURCE = 'BBMP_2025_OPEN_DATA'

CATEGORY_DEPARTMENT = {
    'electrical': 'Electricity Department',
    'solid waste related': 'Sanitation & Waste Management Department',
    'solid waste (garbage) related': 'Sanitation & Waste Management Department',
    'road maintenance': 'Roads & Public Works Department',
    'road infrastructure': 'Roads & Public Works Department',
    'storm water drainage': 'Drainage & Sewerage Department',
    'water crisis': 'Water Supply Department',
    'water supply': 'Water Supply Department',
    'veterinary': 'Public Facilities Department',
    'forest': 'Public Facilities Department',
    'parks and playgrounds': 'Public Facilities Department',
    'lakes': 'Public Facilities Department',
    'health department': 'Public Facilities Department',
}

STATUS_MAP = {
    'closed': (ComplaintStatus.CLOSED, ComplaintRecordType.HISTORICAL_CLOSED),
    'non relevant': (ComplaintStatus.CLOSED, ComplaintRecordType.HISTORICAL_CLOSED),
    'registered': (ComplaintStatus.SUBMITTED, ComplaintRecordType.HISTORICAL_ACTIVE_SNAPSHOT),
    'in progress': (ComplaintStatus.PROCESSING, ComplaintRecordType.HISTORICAL_ACTIVE_SNAPSHOT),
    'reopen': (ComplaintStatus.ESCALATED, ComplaintRecordType.HISTORICAL_ACTIVE_SNAPSHOT),
    'long term solution': (ComplaintStatus.PROCESSING, ComplaintRecordType.HISTORICAL_ACTIVE_SNAPSHOT),
}

def clean(v):
    return (v or '').strip()

def parse_date(v):
    v = clean(v)
    if not v: return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(v.replace('Z', '+00:00')).replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)

def department_for(category):
    c = clean(category).lower()
    if c in CATEGORY_DEPARTMENT: return CATEGORY_DEPARTMENT[c]
    if 'road' in c: return 'Roads & Public Works Department'
    if any(x in c for x in ('waste','garbage','sanitation')): return 'Sanitation & Waste Management Department'
    if any(x in c for x in ('drain','sewer')): return 'Drainage & Sewerage Department'
    if any(x in c for x in ('water','rainwater')): return 'Water Supply Department'
    if any(x in c for x in ('electric','street light','streetlight')): return 'Electricity Department'
    return 'General Administration'

def priority_for(category, subcategory):
    text = f'{category} {subcategory}'.lower()
    if any(k in text for k in ('fire','electric pole','live wire','sewage overflow','tree fallen')):
        return PriorityEnum.HIGH
    if any(k in text for k in ('pothole','garbage','street light','water leak','drain')):
        return PriorityEnum.MEDIUM
    return PriorityEnum.LOW

async def main(limit):
    inserted = skipped = 0
    async with AsyncSessionLocal() as db:
        with open(CSV_PATH, encoding='utf-8-sig', newline='') as f:
            for row in csv.DictReader(f):
                if limit and inserted >= limit: break
                raw_id = clean(row.get('Complaint ID'))
                if not raw_id: continue
                ticket_id = f'BBMP-{raw_id}'
                exists = await db.scalar(select(Complaint.id).where(Complaint.ticket_id == ticket_id))
                if exists:
                    skipped += 1
                    continue
                category = clean(row.get('Category')) or 'Others'
                subcategory = clean(row.get('Sub Category')) or category
                raw_status = clean(row.get('Grievance Status')).lower()
                status, record_type = STATUS_MAP.get(raw_status, (ComplaintStatus.SUBMITTED, ComplaintRecordType.HISTORICAL_ACTIVE_SNAPSHOT))
                ward = clean(row.get('Ward Name')) or 'Unknown Ward'
                remarks = clean(row.get('Staff Remarks'))
                staff = clean(row.get('Staff Name'))
                description = f'Historical BBMP grievance. Category: {category}. Sub-category: {subcategory}.'
                if remarks: description += f' Original staff remarks: {remarks}.'
                if staff: description += f' Historical staff reference: {staff}.'
                created = parse_date(row.get('Grievance Date'))
                complaint = Complaint(
                    ticket_id=ticket_id,
                    title=subcategory[:255], description=description,
                    category=category[:100], department=department_for(category)[:100], district=ward[:100],
                    priority=priority_for(category, subcategory), status=status,
                    record_type=record_type, data_source=SOURCE,
                    created_at=created, updated_at=created,
                )
                db.add(complaint)
                inserted += 1
                if inserted % 1000 == 0:
                    await db.commit(); print(f'Imported {inserted} records...')
        await db.commit()
    print(f'Completed. Inserted={inserted}, skipped_existing={skipped}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=20000, help='0 imports all rows')
    args = parser.parse_args()
    asyncio.run(main(args.limit))
