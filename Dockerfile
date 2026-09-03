# Multi-stage Dockerfile for CivicSetu Backend (AI & Data Analytics Based Urban Infrastructure Intelligence Platform)

# Stage 1: Build dependencies
FROM python:3.11-slim as builder

WORKDIR /build

# Install system compile requirements (required for some packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtualenv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements file
COPY requirements.txt .

# Install CPU-specific torch first to save download size and disk space, then install other deps
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
    torch==2.1.2 \
    sentence-transformers==2.2.2 && \
    pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime image
FROM python:3.11-slim as runner

LABEL org.opencontainers.image.title="CivicSetu" \
      org.opencontainers.image.description="AI & Data Analytics Based Urban Infrastructure Intelligence Platform" \
      org.opencontainers.image.vendor="CivicSetu"

WORKDIR /app

# Install runtime system dependencies (like libpq for postgres connection)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtualenv from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH=/app

# Ensure output/log/static/upload folders exist with correct permissions
RUN mkdir -p outputs logs app/static/uploads

# Copy application files
COPY . .

# Expose FastAPI default port
EXPOSE 8000

# Default CMD is to run alembic migrations then start uvicorn
CMD sh -c "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4"
