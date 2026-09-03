# CivicSetu Core Services & Frontend

This directory contains the core implementation of the **CivicSetu** platform — an AI & Data Analytics Based Urban Infrastructure Intelligence Platform — comprising the FastAPI Async Backend and the React 18 / Vite Frontend.

---

## 🏗️ Architecture & Component Overview

```text
CivicSetu/
├── app/                      # FastAPI Backend Core
│   ├── api/                  # REST Controllers & Route Handlers
│   │   └── routes/           # auth, complaints, officer, analytics, reports, notifications
│   ├── core/                 # Config, security, JWT token utilities
│   ├── crud/                 # Database access layer
│   ├── db/                   # Async SQLAlchemy engine & sessions
│   ├── engines/              # SLA escalation, routing, FAISS RAG, RL engines
│   ├── ml/                   # Machine learning models & PyTorch classifiers
│   ├── models/               # 7 relational ORM models (users, complaints, otps, etc.)
│   ├── schemas/              # Pydantic validation schemas
│   ├── services/             # Decision Agent, Geo-clustering, Email, Storage, Analytics
│   └── main.py               # Application entry point
├── core_ai/                  # High-level AI vector store & escalation interfaces
├── frontend/                 # React Frontend App
│   ├── src/
│   │   ├── components/       # Reusable components (Navbar, Modals, Heatmap)
│   │   ├── context/          # Global Auth state
│   │   ├── pages/            # View components (Citizen, Officer, Admin/CM, Chatbot)
│   │   └── services/         # Axios interceptor & Socket.IO listeners
│   └── vite.config.ts        # Vite configuration
├── alembic/                  # Database migration scripts
├── Dockerfile                # Backend containerization file
├── docker-compose.yml        # Docker orchestrator
└── seed_db.py                # Database population script
```

---

## ⚡ Quick Start Instructions

### 1. Environment Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 2. Database Initialization

```bash
python seed_db.py
```

### 3. Run Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```

Access OpenAPI Swagger documentation at: `http://localhost:8000/docs`

### 4. Run Frontend App

```bash
cd frontend
npm install
npm run dev
```

Access Frontend interface at: `http://localhost:5173`

---

## 🐳 Docker Deployment

To launch the full stack environment using Docker Compose:

```bash
docker-compose up --build
```

This starts:

- **FastAPI Backend** on port `8000`
- **PostgreSQL Database** on port `5432`
- **Redis** (broker/cache) on port `6379`
- **Celery Worker & Beat** (background tasks and SLA escalation scheduling)

---

## 🔑 Authentication Flow

1. **OTP Request**: `POST /api/v1/auth/request-otp` sends a 6-digit code via email.
2. **OTP Verification**: `POST /api/v1/auth/verify-otp` validates the code and returns an Access JWT Token + Refresh Cookie.
3. **Role Guards**: Endpoints enforce role checks (`CITIZEN`, `OFFICER`, `HEAD`, `ADMIN`).
