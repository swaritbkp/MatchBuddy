"""
MatchBuddy API — Stadium Safety & Mobility OS
FastAPI application entry point.
"""

import logging
import os
import sys
import time
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

# ── Structured Logging ──────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("matchbuddy")


# ── Lifespan — initialise shared resources once ─────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown hook — manage connection pools here."""
    from services import maps_service

    logger.info("MatchBuddy API starting up")
    maps_service.start_client()
    yield
    logger.info("MatchBuddy API shutting down")
    await maps_service.stop_client()


# ── App ─────────────────────────────────────────────────────────────
from routes import crowd, meetpoint, sos, vehicle  # noqa: E402  (after dotenv)

app = FastAPI(
    title="MatchBuddy API",
    version="2.0",
    description="Stadium Safety & Mobility OS — built for Google hackathon",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict origins to your Cloud Run URL before production
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request-ID Middleware ───────────────────────────────────────────
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Request-ID"] = request_id
    logger.debug(
        "%s %s → %s (%sms) [%s]",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        request_id,
    )
    return response


# ── Routers ─────────────────────────────────────────────────────────
app.include_router(sos.router, prefix="/api/sos", tags=["SOS"])
app.include_router(vehicle.router, prefix="/api/vehicle", tags=["Vehicle"])
app.include_router(crowd.router, prefix="/api/crowd", tags=["Crowd"])
app.include_router(meetpoint.router, prefix="/api/meetpoint", tags=["MeetPoint"])


@app.get("/health", tags=["System"])
def health():
    return {"status": "ok", "app": "MatchBuddy", "version": "2.0"}


# ── Serve React frontend (built dist/) ──────────────────────────────
frontend_dist = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.isdir(assets_dir):
        app.mount(
            "/assets",
            StaticFiles(directory=assets_dir),
            name="assets",
        )

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Serve specific static files if they exist
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        # Fall back to index.html for SPA routing
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return JSONResponse({"error": "Frontend not built"}, status_code=404)
