"""
MatchBuddy API — Route Tests.

Mocks all external services (Gemini, Firebase, Maps) to test
route logic in isolation. No real API keys required.
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


# ── Helpers ─────────────────────────────────────────────────────────

def _make_sos_payload(user_name="Test User", emergency_type="medical"):
    return {
        "user_name": user_name,
        "seat_zone": "Section A, Row 1",
        "gps_lat": 19.0596,
        "gps_lng": 72.9196,
        "emergency_type": emergency_type,
        "contact_phone": "9999999999",
        "venue_name": "DY Patil Stadium",
    }


# ── Health Check ────────────────────────────────────────────────────

def test_health_check():
    """GET /health returns status ok with app name."""
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["app"] == "MatchBuddy"
    assert body["status"] == "ok"
    assert body["version"] == "2.0"


# ── SOS Routes ──────────────────────────────────────────────────────

def test_sos_trigger_validation():
    """Missing required fields should return 422."""
    response = client.post("/api/sos/trigger", json={"user_name": "Test"})
    assert response.status_code == 422


def test_sos_trigger_invalid_type():
    """Invalid emergency type (e.g. 'explosion') should return 422."""
    response = client.post(
        "/api/sos/trigger",
        json=_make_sos_payload(emergency_type="explosion"),
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

    response = client.post("/api/sos/trigger", json=_make_sos_payload())
    assert response.status_code == 200
    data = response.json()
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
    """4th SOS trigger within 1 hour should be rate-limited (429)."""
    mock_gemini.return_value = {
        "fan_message": "Stay calm.",
        "security_alert": "ALERT",
    }

    from routes.sos import _sos_attempts
    _sos_attempts.clear()

    for i in range(3):
        response = client.post(
            "/api/sos/trigger",
            json=_make_sos_payload(user_name="RateLimitUser"),
        )
        assert response.status_code == 200

    # 4th attempt should be rejected
    response = client.post(
        "/api/sos/trigger",
        json=_make_sos_payload(user_name="RateLimitUser"),
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
    """Valid crowd check-in should write to Firebase and return 200."""
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
            mock_db.assert_called_once()


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
    """Venue with no reports returns empty gates list."""
    with patch("routes.crowd.firebase_service.read_db", return_value=None):
        response = client.get("/api/crowd/density/nonexistent-venue")
        assert response.status_code == 200
        assert response.json()["gates"] == []


@patch("routes.crowd.gemini_service.exit_advice", new_callable=AsyncMock)
def test_crowd_exit_advice(mock_gemini):
    """Exit advice endpoint calls Gemini and returns recommendation."""
    mock_gemini.return_value = "Take Gate 3, it has low crowd density."
    response = client.post(
        "/api/crowd/exit-advice",
        json={
            "seat_zone": "Section B",
            "venue_name": "Test Stadium",
            "gate_density": [
                {"gate_id": "Gate 1", "density": "high"},
                {"gate_id": "Gate 3", "density": "low"},
            ],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "gemini_advice" in data
    assert data["seat_zone"] == "Section B"
    mock_gemini.assert_called_once()


# ── MeetPoint Routes ───────────────────────────────────────────────

def test_meetpoint_create_and_retrieve():
    """Create a meetpoint, then retrieve it by ID — full round-trip."""
    created_data = {}

    with patch("routes.meetpoint.firebase_service.write_db", return_value=None):
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
        created_data = response.json()
        assert created_data["meet_id"].startswith("meet_")
        assert "share_url" in created_data

    # Retrieve the same meetpoint
    with patch(
        "routes.meetpoint.firebase_service.read_db",
        return_value={
            "meet_id": created_data["meet_id"],
            "pin_lat": 19.0596,
            "pin_lng": 72.9196,
            "landmark_label": "Main Gate North",
            "expires_at": int(time.time()) + 14400,
        },
    ):
        response = client.get(f"/api/meetpoint/{created_data['meet_id']}")
        assert response.status_code == 200
        assert response.json()["landmark_label"] == "Main Gate North"


def test_meetpoint_retrieve_expired():
    """Expired meetpoints should return 410 Gone."""
    expired_data = {
        "meet_id": "meet_abc123",
        "pin_lat": 19.0,
        "pin_lng": 72.0,
        "expires_at": int(time.time()) - 100,
        "landmark_label": "Test",
    }
    with patch("routes.meetpoint.firebase_service.read_db", return_value=expired_data):
        with patch("routes.meetpoint.firebase_service.delete_field", return_value=None):
            response = client.get("/api/meetpoint/meet_abc123")
            assert response.status_code == 410


def test_meetpoint_not_found():
    """Non-existent meetpoint should return 404."""
    with patch("routes.meetpoint.firebase_service.read_db", return_value=None):
        response = client.get("/api/meetpoint/meet_nonexistent")
        assert response.status_code == 404


# ── Vehicle Routes ──────────────────────────────────────────────────

def test_vehicle_save_no_photo():
    """Save parking without photo — GPS + manual note only."""
    with patch("routes.vehicle.firebase_service.write_db", return_value=None):
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
    """Non-existent vehicle should return 404."""
    with patch("routes.vehicle.firebase_service.read_db", return_value=None):
        response = client.get("/api/vehicle/nonexistent_user")
        assert response.status_code == 404


@patch("routes.vehicle.maps_service.get_route_time", new_callable=AsyncMock)
@patch("routes.vehicle.gemini_service.gate_advice", new_callable=AsyncMock)
def test_vehicle_gate_suggestion(mock_gemini, mock_maps):
    """Gate suggestion calls Maps API + Gemini and returns recommendation."""
    mock_maps.return_value = {"minutes": 5, "text": "5 mins"}
    mock_gemini.return_value = "Take Gate 2, saves 8 minutes."

    response = client.post(
        "/api/vehicle/gate-suggestion",
        json={
            "user_gps_lat": 19.06,
            "user_gps_lng": 72.92,
            "vehicle_gps_lat": 19.07,
            "vehicle_gps_lng": 72.93,
            "venue_name": "Test Stadium",
            "gates": [
                {"gate_id": "Gate 1", "exit_lat": 19.062, "exit_lng": 72.921},
                {"gate_id": "Gate 2", "exit_lat": 19.058, "exit_lng": 72.922},
            ],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "recommended_gate" in data
    assert "gemini_advice" in data
    assert "gate_breakdown" in data
    assert len(data["gate_breakdown"]) == 2
