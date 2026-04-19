"""
Vehicle / Parking Routes — save parking, get parking, gate suggestion.

Supports photo upload with Gemini Vision auto-labelling.
"""

import base64
import io
import logging
import time
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel, Field

from services import firebase_service, gemini_service, maps_service

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request Models ──────────────────────────────────────────────────

class GateInfo(BaseModel):
    gate_id: str
    exit_lat: float = Field(..., ge=-90, le=90)
    exit_lng: float = Field(..., ge=-180, le=180)


class GateSuggestionRequest(BaseModel):
    user_gps_lat: float = Field(..., ge=-90, le=90)
    user_gps_lng: float = Field(..., ge=-180, le=180)
    vehicle_gps_lat: float = Field(..., ge=-90, le=90)
    vehicle_gps_lng: float = Field(..., ge=-180, le=180)
    venue_name: str = Field(..., min_length=1)
    gates: List[GateInfo]


# ── Routes ──────────────────────────────────────────────────────────

@router.post("/save")
async def save_vehicle(
    user_id: str = Form(...),
    gps_lat: float = Form(...),
    gps_lng: float = Form(...),
    venue_name: str = Form(...),
    manual_note: str = Form(""),
    photo: Optional[UploadFile] = File(None),
):
    try:
        parking_id = f"park_{user_id}_{int(time.time())}"
        gemini_zone_label = ""
        photo_url = ""

        # Safe check: photo.size may be None for streaming uploads
        has_photo = photo is not None and photo.filename and (photo.size is None or photo.size > 0)

        if has_photo:
            image_bytes = await photo.read()
            if len(image_bytes) > 0:
                img = Image.open(io.BytesIO(image_bytes))
                img.thumbnail((800, 800))
                # Convert to RGB to ensure JPEG save doesn't fail on RGBA/P images
                if img.mode not in ("RGB",):
                    img = img.convert("RGB")
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=75)
                compressed_bytes = buffer.getvalue()

                photo_url = firebase_service.upload_photo(user_id, compressed_bytes)

                image_base64 = base64.b64encode(compressed_bytes).decode("utf-8")
                gemini_zone_label = await gemini_service.analyze_parking_photo(
                    image_base64
                )
                logger.info("Parking photo analysed for user=%s label=%s", user_id, gemini_zone_label[:50])

        parking_data = {
            "parking_id": parking_id,
            "user_id": user_id,
            "gps_lat": gps_lat,
            "gps_lng": gps_lng,
            "venue_name": venue_name,
            "gemini_zone_label": gemini_zone_label,
            "manual_note": manual_note,
            "photo_url": photo_url,
            "saved_at": int(time.time()),
        }

        firebase_service.write_db(f"/parking/{user_id}", parking_data)
        logger.info("Parking saved: %s for user=%s", parking_id, user_id)
        return parking_data
    except Exception as e:
        logger.exception("Vehicle save failed for user=%s", user_id)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{user_id}")
async def get_vehicle(user_id: str):
    data = firebase_service.read_db(f"/parking/{user_id}")
    if not data:
        raise HTTPException(
            status_code=404, detail="No parking data found for this user."
        )
    return data


@router.delete("/{user_id}")
async def delete_vehicle(user_id: str):
    firebase_service.delete_field(f"/parking/{user_id}")
    logger.info("Parking data deleted for user=%s", user_id)
    return {"deleted": True, "user_id": user_id}


@router.post("/gate-suggestion")
async def gate_suggestion(request: GateSuggestionRequest):
    try:
        gate_times = []
        for gate in request.gates:
            walk = await maps_service.get_route_time(
                request.user_gps_lat,
                request.user_gps_lng,
                gate.exit_lat,
                gate.exit_lng,
                mode="walking",
            )
            drive = await maps_service.get_route_time(
                gate.exit_lat,
                gate.exit_lng,
                request.vehicle_gps_lat,
                request.vehicle_gps_lng,
                mode="driving",
            )
            total = walk["minutes"] + drive["minutes"]
            gate_times.append(
                {
                    "gate_id": gate.gate_id,
                    "walk_min": walk["minutes"],
                    "drive_min": drive["minutes"],
                    "total_min": total,
                }
            )

        gate_times.sort(key=lambda x: x["total_min"])
        recommended_gate = gate_times[0]["gate_id"] if gate_times else "None"

        gemini_advice = await gemini_service.gate_advice(
            gate_times, request.venue_name
        )

        logger.info(
            "Gate suggestion: recommended=%s for venue=%s",
            recommended_gate,
            request.venue_name,
        )
        return {
            "recommended_gate": recommended_gate,
            "gemini_advice": gemini_advice,
            "gate_breakdown": gate_times,
        }
    except Exception as e:
        logger.exception("Gate suggestion failed")
        raise HTTPException(status_code=500, detail="Internal server error")
