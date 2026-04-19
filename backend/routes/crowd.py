"""
Crowd Density Routes — check-in reports, density feed, exit advice.

Crowd density is crowd-sourced from fans and expires after 20 minutes.
"""

import logging
import time
from enum import Enum
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import firebase_service, gemini_service

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request Models ──────────────────────────────────────────────────

class DensityLevel(str, Enum):
    low = "low"
    moderate = "moderate"
    high = "high"


class CheckinRequest(BaseModel):
    gate_id: str = Field(..., min_length=1, max_length=100)
    density: DensityLevel
    venue_id: str = Field(..., min_length=1, max_length=100)


class GateDensity(BaseModel):
    gate_id: str
    density: str


class ExitAdviceRequest(BaseModel):
    seat_zone: str = Field(..., min_length=1)
    venue_name: str = Field(..., min_length=1)
    gate_density: List[GateDensity]


# ── Routes ──────────────────────────────────────────────────────────

@router.post("/checkin")
async def checkin(request: CheckinRequest):
    try:
        now = int(time.time())
        path = f"/crowd_density/{request.venue_id}/{request.gate_id}"
        existing = firebase_service.read_db(path) or {}
        report_count = existing.get("reports", 0) + 1

        data = {
            "gate_id": request.gate_id,
            "density": request.density.value,
            "reports": report_count,
            "reported_at": now,
            "expires_at": now + 1200,  # 20-minute TTL
        }
        firebase_service.write_db(path, data)
        logger.info(
            "Crowd checkin: gate=%s density=%s venue=%s reports=%d",
            request.gate_id,
            request.density.value,
            request.venue_id,
            report_count,
        )
        return {
            "received": True,
            "gate_id": request.gate_id,
            "reports": report_count,
        }
    except Exception as e:
        logger.exception("Crowd checkin failed")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/density/{venue_id}")
async def get_density(venue_id: str):
    try:
        now = int(time.time())
        all_gates = firebase_service.read_db(f"/crowd_density/{venue_id}") or {}
        active_gates = []
        for gate_id, gate_data in all_gates.items():
            if not isinstance(gate_data, dict):
                continue
            if gate_data.get("expires_at", 0) > now:
                minutes_ago = int((now - gate_data.get("reported_at", now)) / 60)
                gate_data["last_updated"] = (
                    f"{minutes_ago} min ago" if minutes_ago > 0 else "just now"
                )
                active_gates.append(gate_data)

        return {
            "venue_id": venue_id,
            "gates": active_gates,
            "total_active": len(active_gates),
        }
    except Exception as e:
        logger.exception("Failed to fetch crowd density")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/exit-advice")
async def exit_advice(request: ExitAdviceRequest):
    try:
        density_list = [
            {"gate_id": g.gate_id, "density": g.density}
            for g in request.gate_density
        ]
        advice = await gemini_service.exit_advice(
            request.seat_zone, density_list, request.venue_name
        )
        logger.info(
            "Exit advice generated for zone=%s venue=%s",
            request.seat_zone,
            request.venue_name,
        )
        return {"gemini_advice": advice, "seat_zone": request.seat_zone}
    except Exception as e:
        logger.exception("Exit advice generation failed")
        raise HTTPException(status_code=500, detail="Internal server error")
