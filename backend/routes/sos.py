"""
SOS Emergency Routes — trigger, status update, active feed.

Includes Gemini AI triage, Firebase real-time alerts, and FCM push.
Rate-limited to 3 triggers per user per hour.
"""

import logging
import time
import uuid
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Body, HTTPException, Query
from pydantic import BaseModel, Field

from services import firebase_service, gemini_service

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request Models ──────────────────────────────────────────────────

class SOSTriggerRequest(BaseModel):
    user_name: str = Field(..., min_length=1, max_length=100)
    seat_zone: str = Field(..., min_length=1, max_length=200)
    gps_lat: float = Field(..., ge=-90, le=90)
    gps_lng: float = Field(..., ge=-180, le=180)
    emergency_type: str = Field(
        ..., pattern="^(medical|security|lost_person|fire)$"
    )
    contact_phone: str = Field(..., min_length=5, max_length=20)
    venue_name: str = Field(..., min_length=1, max_length=200)


# ── Rate Limiter ────────────────────────────────────────────────────
# In-memory — acceptable for single-instance hackathon demo.
# Production: use Redis or Firestore with TTL.

_sos_attempts: dict[str, list[float]] = defaultdict(list)
_MAX_ATTEMPTS = 3
_WINDOW_SECONDS = 3600


def _check_rate_limit(user_key: str) -> bool:
    """Allow max _MAX_ATTEMPTS SOS triggers per _WINDOW_SECONDS per user_key."""
    now = time.time()
    _sos_attempts[user_key] = [
        t for t in _sos_attempts[user_key] if now - t < _WINDOW_SECONDS
    ]
    if len(_sos_attempts[user_key]) >= _MAX_ATTEMPTS:
        return False
    _sos_attempts[user_key].append(now)
    return True


# ── Routes ──────────────────────────────────────────────────────────

@router.post("/trigger")
async def trigger_sos(request: SOSTriggerRequest):
    if not _check_rate_limit(request.user_name):
        raise HTTPException(
            status_code=429,
            detail="Too many SOS attempts. Max 3 per hour.",
        )

    try:
        # UUID-based alert IDs prevent collisions from rapid triggers
        alert_id = f"sos_{uuid.uuid4().hex[:12]}"

        gemini_result = await gemini_service.triage(
            request.emergency_type,
            request.seat_zone,
            request.gps_lat,
            request.gps_lng,
            request.venue_name,
        )

        alert_data = {
            "alert_id": alert_id,
            "user_name": request.user_name,
            "seat_zone": request.seat_zone,
            "gps_lat": request.gps_lat,
            "gps_lng": request.gps_lng,
            "emergency_type": request.emergency_type,
            "venue_name": request.venue_name,
            "fan_message": gemini_result["fan_message"],
            "security_alert": gemini_result["security_alert"],
            "status": "active",
            "created_at": int(time.time()),
            "assigned_to": None,
            "resolved_at": None,
        }

        firebase_service.write_db(f"/sos_alerts/{alert_id}", alert_data)

        firebase_service.send_fcm_push(
            token=request.contact_phone,
            title="⚠️ MatchBuddy SOS Alert",
            body=(
                f"{request.user_name} triggered {request.emergency_type} "
                f"SOS at {request.venue_name}. Location shared."
            ),
        )

        logger.info(
            "SOS alert created: %s type=%s venue=%s",
            alert_id,
            request.emergency_type,
            request.venue_name,
        )
        return alert_data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("SOS trigger failed")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{alert_id}/status")
async def update_status(alert_id: str, status: str = Body(..., embed=True)):
    valid_statuses = ("acknowledged", "dispatched", "resolved")
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}",
        )

    try:
        firebase_service.update_db(
            f"/sos_alerts/{alert_id}", {"status": status}
        )

        if status == "resolved":
            # Scrub ALL PII fields from the resolved alert
            for field in ("user_name", "gps_lat", "gps_lng", "contact_phone"):
                firebase_service.delete_field(
                    f"/sos_alerts/{alert_id}/{field}"
                )
            firebase_service.update_db(
                f"/sos_alerts/{alert_id}",
                {"resolved_at": int(time.time())},
            )

        logger.info("SOS status updated: %s → %s", alert_id, status)
        return {"alert_id": alert_id, "status": status}
    except Exception as e:
        logger.exception("SOS status update failed")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/active")
async def get_active_alerts(venue_name: Optional[str] = Query(None)):
    try:
        all_alerts = firebase_service.read_db("/sos_alerts") or {}
        active_alerts = []
        for _aid, data in all_alerts.items():
            if not isinstance(data, dict):
                continue
            if data.get("status") == "resolved":
                continue
            if venue_name and data.get("venue_name") != venue_name:
                continue
            active_alerts.append(data)

        active_alerts.sort(
            key=lambda x: x.get("created_at", 0), reverse=True
        )
        return active_alerts
    except Exception as e:
        logger.exception("Failed to fetch active alerts")
        raise HTTPException(status_code=500, detail="Internal server error")
