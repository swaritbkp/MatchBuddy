"""
MeetPoint Routes — create, retrieve, delete shareable meeting pins.

Meet points expire after 4 hours and auto-delete on stale retrieval.
"""

import logging
import time
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services import firebase_service

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request Models ──────────────────────────────────────────────────

class MeetPointCreateRequest(BaseModel):
    venue_id: str = Field(..., min_length=1, max_length=100)
    created_by: str = Field(..., min_length=1, max_length=100)
    pin_lat: float = Field(..., ge=-90, le=90)
    pin_lng: float = Field(..., ge=-180, le=180)
    landmark_label: str = Field(..., min_length=1, max_length=200)


# ── Routes ──────────────────────────────────────────────────────────

@router.post("/create")
async def create_meetpoint(request: MeetPointCreateRequest):
    try:
        meet_id = f"meet_{uuid.uuid4().hex[:8]}"
        now = int(time.time())
        meet_data = {
            "meet_id": meet_id,
            "venue_id": request.venue_id,
            "created_by": request.created_by,
            "pin_lat": request.pin_lat,
            "pin_lng": request.pin_lng,
            "landmark_label": request.landmark_label,
            "created_at": now,
            "expires_at": now + 14400,  # 4-hour TTL
        }

        firebase_service.write_db(f"/meet_points/{meet_id}", meet_data)
        meet_data["share_url"] = f"/meet/{meet_id}"

        logger.info(
            "MeetPoint created: %s label=%s by=%s",
            meet_id,
            request.landmark_label,
            request.created_by,
        )
        return meet_data
    except Exception as e:
        logger.exception("MeetPoint creation failed")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{meet_id}")
async def get_meetpoint(meet_id: str):
    try:
        data = firebase_service.read_db(f"/meet_points/{meet_id}")
        if not data:
            raise HTTPException(
                status_code=404, detail="Meet point not found or expired."
            )

        if data.get("expires_at", 0) < int(time.time()):
            firebase_service.delete_field(f"/meet_points/{meet_id}")
            logger.info("Expired MeetPoint cleaned up: %s", meet_id)
            raise HTTPException(
                status_code=410, detail="This meet point has expired."
            )

        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("MeetPoint retrieval failed for %s", meet_id)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{meet_id}")
async def delete_meetpoint(meet_id: str):
    try:
        firebase_service.delete_field(f"/meet_points/{meet_id}")
        logger.info("MeetPoint deleted: %s", meet_id)
        return {"deleted": True, "meet_id": meet_id}
    except Exception as e:
        logger.exception("MeetPoint deletion failed for %s", meet_id)
        raise HTTPException(status_code=500, detail="Internal server error")
