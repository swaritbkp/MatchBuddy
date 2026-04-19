# ──────────────────────────────────────────────────────────────
# Stage 1: Build the React frontend
# ──────────────────────────────────────────────────────────────
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --production=false
COPY frontend/ .
RUN npm run build

# ──────────────────────────────────────────────────────────────
# Stage 2: Production Python image
# ──────────────────────────────────────────────────────────────
FROM python:3.11-slim

# Security: non-root user
RUN groupadd -r matchbuddy && useradd -r -g matchbuddy matchbuddy

WORKDIR /app

# Install backend dependencies (cached layer)
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist/ ./frontend/dist/

# Set working directory for uvicorn
WORKDIR /app/backend

# Switch to non-root user
USER matchbuddy

# Cloud Run uses PORT env var (default 8080)
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
