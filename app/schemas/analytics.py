from pydantic import BaseModel, Field
from typing import Dict, List, Any

class OfficerRankItem(BaseModel):
    officer_id: str = Field(..., description="UUID of the officer")
    officer_name: str = Field(..., description="Name of the officer")
    resolved_count: int = Field(..., description="Total resolved complaints")

class RecurringProblemItem(BaseModel):
    category: str = Field(..., description="Complaint category, e.g. 'Roads'")
    region: str = Field(..., description="Human-readable region/area name of the hotspot")
    cluster_id: str = Field(..., description="DBSCAN hotspot cluster identifier")
    complaint_count: int = Field(..., description="Number of complaints in this recurring group")
    center_lat: float = Field(..., description="Latitude of the hotspot center")
    center_lon: float = Field(..., description="Longitude of the hotspot center")
    label: str = Field(..., description="Human-readable label, e.g. 'Recurring Roads problem in Sector 10'")

class RecurringProblemsResponse(BaseModel):
    lookback_days: int = Field(..., description="Lookback window in days used to compute this result")
    threshold: int = Field(..., description="Minimum complaint count required to flag a group as recurring")
    recurring_problems: List[RecurringProblemItem] = Field(..., description="Flagged recurring-problem groups")


class AnalyticsSnapshotResponse(BaseModel):
    timestamp: str = Field(..., description="ISO timestamp of the snapshot computation")
    total_complaints: int = Field(..., description="Total complaints count")
    pending: int = Field(..., description="Count of pending complaints")
    resolved: int = Field(..., description="Count of resolved complaints")
    escalated: int = Field(..., description="Count of escalated complaints")
    average_sla: float = Field(..., description="Average SLA in hours")
    average_resolution_time: float = Field(..., description="Average resolution time in hours")
    top_departments: Dict[str, int] = Field(..., description="Top departments count descending")
    top_districts: Dict[str, int] = Field(..., description="Top districts count descending")
    top_categories: Dict[str, int] = Field(..., description="Top categories count descending")
    officer_ranking: List[OfficerRankItem] = Field(..., description="Officer resolved ranking descending")



