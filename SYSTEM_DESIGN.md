# CivicSetu System Design & Architecture

CivicSetu is organized across six layers: **Citizen Interface, Data Layer, AI/NLP Layer, Priority Engine, Municipal Workflow, and Analytics/Decision Support.** This document covers the backend architecture that implements those layers.

## Architecture Breakdown
1. **Classifier (`app/ml/`)**: Uses XGBoost/RandomForest (with PyTorch support built-in) to perform initial inference for Incident Type and Severity. Utilizes SMOTE for class imbalance and BCEWithLogits for multi-label predictions across CivicSetu's taxonomy (Roads, Water, Waste, Electricity, Drainage, Public Facilities, Other). No trained weights ship by default — the live classification path is the Groq LLM fallback (see `app/services/ai/groq_classifier.py`).
2. **RAG / FAISS (`app/services/memory/`)**: High-performance vector database. Converts text via `sentence-transformers` and searches for historical precedents. Stores `metadata` including location and prior labels. Also powers the Priority Engine's `frequency_score` (recurring-complaint signal).
3. **Agents (`app/services/agents/`)**: Specialized asynchronous worker modules (Classification, Severity, Complaint, Routing) that process data independently and cross-check outputs.
4. **Priority Engine (`app/services/priority/priority_engine.py`)**: Computes a transparent, weighted `priority_score` (Severity, Impact, Frequency, Location Risk) with a `priority_breakdown` explaining each component — rather than exposing only an opaque ML label. See the root `README.md` "Priority Engine" section for the formula.
5. **Memory System (`FaissMemory`)**: A self-sculpting ledger. Good predictions are boosted in the vector space, while penalized predictions (via RL) are deprecated to prevent hallucination loops.
6. **Async System (`AsyncQueue`)**: Handles post-decision execution (e.g., department dispatching) without blocking the main event loop.
7. **Dashboard (`ClusterEngine`)**: Utilizes DBSCAN to map geo-tagged complaints into localized hotspots for frontend consumption, and feeds both the Priority Engine's `location_risk_score` and the Recurring Problem Detector (`app/services/analytics_reports/recurring_problems.py`).

## Data Flow
`Input` → `Geo-Tagging` → `Classification` → `Retrieval (RAG)` → `Agent Negotiation (Decision)` → `Priority Engine Scoring` → `Async Execution` → `Memory Storage (Learning)`

## Agent Behavior
Agents possess autonomy to:
- **Call RAG**: View historical context to break ties.
- **Call Memory**: Validate past decisions.
- **Call Other Agents**: Using the `re_evaluate()` hook, agents can yield to peers. If the `ComplaintAgent` is highly confident about an electricity issue, the `RoutingAgent` will actively switch its assignment to the `Electricity Department`.

## Memory Design
Stores:
- **Past Complaints**: The raw incident text.
- **Actions**: The final decisions and classifications.
- **Outcomes/Rewards**: The RL system flags objects as `deprecated: True` if the user submits negative feedback.

## Training Pipeline
- **Data Ingestion**: Reads from `raw/train.csv`.
- **Preprocessing**: Cleans, deduplicates, and label-encodes target variables.
- **Training**: Balances data with SMOTE, calculates specific `class_weights`, and fits models.
- **Evaluation**: Emits precision/recall metrics, class distributions, and confusion matrices.
- **Saving Models**: Exports `.pkl` objects via `joblib` into `app/ml/models`.

## Recurring Problem Detection
`app/services/analytics_reports/recurring_problems.py` groups complaints from the last 30 days by `(category, DBSCAN cluster)` and flags any group with 5+ complaints as a Recurring Problem (e.g. *"Recurring Roads problem in Sector 10"*), exposed via `GET /api/v1/analytics/recurring-problems`.

