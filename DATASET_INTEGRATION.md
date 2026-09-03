# BBMP 2025 Dataset Integration

This project contains the original BBMP grievance CSV at `data/bbmp_grievances_2025.csv` and an additive importer at `import_real_complaints.py`.

## Safety of existing CivicSetu features
Existing live complaint creation and workflows are unchanged. New model fields have defaults:
- `record_type=LIVE`
- `data_source=CIVICSETU_LIVE`

Imported records use:
- `HISTORICAL_CLOSED` for Closed/Non Relevant source records
- `HISTORICAL_ACTIVE_SNAPSHOT` for Registered/In Progress/ReOpen/Long Term Solution records
- `data_source=BBMP_2025_OPEN_DATA`

## Run
```bash
alembic upgrade head
python import_real_complaints.py --limit 20000
```
Import all rows with:
```bash
python import_real_complaints.py --limit 0
```
Duplicate `BBMP-<Complaint ID>` records are skipped.

Historical records intentionally have no citizen login identity, no original image, and no officer account assignment. The source staff name is retained inside the description as historical reference only.
