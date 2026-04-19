"""
MatchBuddy API — Route Tests.

Mocks all external services (Gemini, Firebase, Maps) to test
route logic in isolation.
"""

import os
import sys
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from main import app  # noqa: E402

client = TestClient(app)


# ── Health Check ────────────────────────────────────────────────────

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["app"] == "MatchBuddy"
    assert body["status"] == "ok"


# ── SOS Routes ──────────────────────────────────────────────────────

def test_sos_trigger_validation():
    """Missing required fields should return 422."""
    response = client.post("/api/sos/trigger", json={"user_name": "Test"})
    assert response.status_code == 422


def test_sos_trigger_invalid_type():
    """Invalid emergency type should return 422."""
    response = client.post(
        "/api/sos/trigger",
        json={
            "user_name": "Test User",
            "seat_zone": "Section A",
            "gps_lat": 19.0,
            "gps_lng": 72.0,
            "emergency_type": "invalid_type",
            "contact_phone": "9999999999",
            "venue_name": "Test Venue",
        },
    )
    assert response.status_code == 422


@patch("routes.sos.gemini_service.triage", new_callable=AsyncMock)
@patch("routes.sos.firebase_service.write_db")
@patch("routes.sos.firebase_service.send_fcm_push")
def test_sos_trigger_success(mock_fcm, mock_firebase, mock_gemini):
    """Valid SOS trigger should return 200 with alert data."""
    mock_gemini.return_value = {
        "fan_message": "Stay where you are. First aid is nearby.",
        "security_alert": "MEDICAL — Section A",
    }
    mock_firebase.return_value = None
    mock_fcm.return_value = None

    # Clear rate limiter for this test
    from routes.sos import _sos_attempts
    _sos_attempts.clear()

    response = client.post(
        "/api/sos/trigger",
        json={
            "user_name": "Test User",
            "seat_zone": "Section A, Row 1",
            "gps_lat": 19.0596,
            "gps_lng": 72.9196,
            "emergency_type": "medical",
            "contact_phone": "9999999999",
            "venue_name": "DY Patil Stadium",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "alert_id" in data
    assert data["alert_id"].startswith("sos_")
    assert "fan_message" in data
    assert data["status"] == "active"
    # Verify Firebase was called
    mock_firebase.assert_called_once()
    mock_fcm.assert_called_once()


@patch("routes.sos.gemini_service.triage", new_callable=AsyncMock)
@patch("routes.sos.firebase_service.write_db")
@patch("routes.sos.firebase_service.send_fcm_push")
def test_sos_rate_limit(mock_fcm, mock_firebase, mock_gemini):
    """4th SOS trigger within 1 hour should be rate-limited."""
    mock_gemini.return_value = {
        "fan_message": "Stay calm.",
        "security_alert": "ALERT",
    }

    from routes.sos import _sos_attempts
    _sos_attempts.clear()

    for i in range(3):
        response = client.post(
            "/api/sos/trigger",
            json={
                "user_name": "RateLimitUser",
                "seat_zone": "Zone B",
                "gps_lat": 19.0,
                "gps_lng": 72.0,
                "emergency_type": "security",
                "contact_phone": "1234567890",
                "venue_name": "Test Venue",
            },
        )
        assert response.status_code == 200

    # 4th attempt should be rejected
    response = client.post(
        "/api/sos/trigger",
        json={
            "user_name": "RateLimitUser",
            "seat_zone": "Zone B",
            "gps_lat": 19.0,
            "gps_lng": 72.0,
            "emergency_type": "security",
            "contact_phone": "1234567890",
            "venue_name": "Test Venue",
        },
    )
    assert response.status_code == 429


@patch("routes.sos.firebase_service.update_db")
@patch("routes.sos.firebase_service.delete_field")
def test_sos_resolve_scrubs_pii(mock_delete, mock_update):
    """Resolving an alert should scrub all PII fields including contact_phone."""
    response = client.patch(
        "/api/sos/test_alert_123/status",
        json={"status": "resolved"},
    )
    assert response.status_code == 200

    # Verify all 4 PII fields were deleted
    deleted_paths = [call.args[0] for call in mock_delete.call_args_list]
    assert "/sos_alerts/test_alert_123/user_name" in deleted_paths
    assert "/sos_alerts/test_alert_123/gps_lat" in deleted_paths
    assert "/sos_alerts/test_alert_123/gps_lng" in deleted_paths
    assert "/sos_alerts/test_alert_123/contact_phone" in deleted_paths


def test_sos_invalid_status():
    """Invalid status value should return 400."""
    response = client.patch(
        "/api/sos/test_alert/status",
        json={"status": "invalid_status"},
    )
    assert response.status_code == 400


# ── Crowd Routes ────────────────────────────────────────────────────

def test_crowd_checkin_valid():
    with patch("routes.crowd.firebase_service.write_db") as mock_db:
        with patch("routes.crowd.firebase_service.read_db", return_value=None):
            mock_db.return_value = None
            response = client.post(
                "/api/crowd/checkin",
                json={
                    "gate_id": "Gate 1",
                    "density": "high",
                    "venue_id": "test-venue",
                },
            )
            assert response.status_code == 200
            assert response.json()["received"] is True


def test_crowd_checkin_invalid_density():
    """Invalid density value should return 422."""
    response = client.post(
        "/api/crowd/checkin",
        json={
            "gate_id": "Gate 1",
            "density": "super_high",
            "venue_id": "test-venue",
        },
    )
    assert response.status_code == 422


def test_crowd_density_empty_venue():
    with patch("routes.crowd.firebase_service.read_db", return_value=None):
        response = client.get("/api/crowd/density/nonexistent-venue")
        assert response.status_code == 200
        assert response.json()["gates"] == []


# ── MeetPoint Routes ───────────────────────────────────────────────

def test_meetpoint_create():
    with patch(
        "routes.meetpoint.firebase_service.write_db", return_value=None
    ):
        response = client.post(
            "/api/meetpoint/create",
            json={
                "venue_id": "test-venue",
                "created_by": "Test User",
                "pin_lat": 19.0596,
                "pin_lng": 72.9196,
                "landmark_label": "Main Gate North",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "meet_id" in data
        assert data["meet_id"].startswith("meet_")
        assert "share_url" in data


def test_meetpoint_retrieve_expired():
    expired_data = {
        "meet_id": "meet_abc123",
        "pin_lat": 19.0,
        "pin_lng": 72.0,
        "expires_at": int(time.time()) - 100,
        "landmark_label": "Test",
    }
    with patch(
        "routes.meetpoint.firebase_service.read_db", return_value=expired_data
    ):
        with patch(
            "routes.meetpoint.firebase_service.delete_field",
            return_value=None,
        ):
            response = client.get("/api/meetpoint/meet_abc123")
            assert response.status_code == 410


def test_meetpoint_not_found():
    with patch(
        "routes.meetpoint.firebase_service.read_db", return_value=None
    ):
        response = client.get("/api/meetpoint/meet_nonexistent")
        assert response.status_code == 404


# ── Vehicle Routes ──────────────────────────────────────────────────

def test_vehicle_save_no_photo():
    with patch(
        "routes.vehicle.firebase_service.write_db", return_value=None
    ):
        response = client.post(
            "/api/vehicle/save",
            data={
                "user_id": "test_user",
                "gps_lat": "19.0601",
                "gps_lng": "72.9201",
                "venue_name": "DY Patil Stadium",
                "manual_note": "Near red pillar",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "parking_id" in data
        assert data["gemini_zone_label"] == ""


def test_vehicle_not_found():
    with patch(
        "routes.vehicle.firebase_service.read_db", return_value=None
    ):
        response = client.get("/api/vehicle/nonexistent_user")
        assert response.status_code == 404
