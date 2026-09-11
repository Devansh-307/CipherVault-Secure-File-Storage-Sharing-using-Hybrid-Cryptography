# ==============================================================================
# Multi-Stage Dockerfile for CipherVault Hybrid Cryptography Platform
# Stage 1: Build React 18 + Tailwind CSS Frontend Bundle
# Stage 2: Minimal, High-Performance Python FastAPI Production Runtime
# ==============================================================================

# --- STAGE 1: Frontend Builder ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# --- STAGE 2: Backend & Full Application Runtime ---
FROM python:3.13-slim AS runtime

WORKDIR /app

# Install system utilities and build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code & scripts
COPY backend/ ./backend/
COPY run.py ./
COPY sample_files/ ./sample_files/
COPY create_word_document.py ./
COPY PROJECT_MASTER_GUIDE.md ./
COPY RESUME_BULLET_POINTS.md ./
COPY README.md ./

# Generate the Word report inside the container
RUN python create_word_document.py

# Copy compiled React frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0

# Expose container port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run database seeder and start application server
CMD ["python", "run.py"]
