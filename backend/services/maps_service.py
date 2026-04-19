"""
Google Maps Directions API Service.

Uses a module-level ``httpx.AsyncClient`` for connection pooling.
The client lifecycle is managed via ``start_client`` / ``stop_client``,
called from FastAPI's lifespan hook in ``main.py``.
"""

import logging
import os

import httpx

logger = logging.getLogger(__name__)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Module-level shared client — avoids per-request connection overhead.
_client: httpx.AsyncClient | None = None

_REQUEST_TIMEOUT = 10.0  # seconds


def start_client() -> None:
    """Create the shared httpx client (called on app startup)."""
    global _client
    _client = httpx.AsyncClient(timeout=_REQUEST_TIMEOUT)
    if GOOGLE_MAPS_API_KEY:
        logger.info("Maps service ready (API key configured)")
    else:
        logger.warning("GOOGLE_MAPS_API_KEY not set — route queries will return fallback")


async def stop_client() -> None:
    """Gracefully close the shared httpx client (called on app shutdown)."""
    global _client
    if _client:
        await _client.aclose()
        _client = None
        logger.info("Maps HTTP client closed")


async def get_route_time(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    mode: str = "walking",
) -> dict:
    """
    Query Google Directions API for travel time.

    Returns ``{"minutes": int, "text": "X mins"}``.
    Falls back to ``{"minutes": 999, "text": "unknown"}`` on any error.
    """
    fallback = {"minutes": 999, "text": "unknown"}

    if not GOOGLE_MAPS_API_KEY:
        return fallback

    if _client is None:
        logger.error("Maps client not initialised — call start_client() first")
        return fallback

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": f"{origin_lat},{origin_lng}",
        "destination": f"{dest_lat},{dest_lng}",
        "mode": mode,
        "key": GOOGLE_MAPS_API_KEY,
    }
    if mode == "driving":
        params["departure_time"] = "now"

    try:
        response = await _client.get(url, params=params)
        data = response.json()

        if data.get("status") == "OK" and data.get("routes"):
            leg = data["routes"][0]["legs"][0]
            if mode == "driving" and "duration_in_traffic" in leg:
                seconds = leg["duration_in_traffic"]["value"]
            else:
                seconds = leg["duration"]["value"]

            minutes = max(1, round(seconds / 60))
            return {"minutes": minutes, "text": f"{minutes} mins"}

        logger.warning(
            "Directions API non-OK status=%s for %s→%s (%s)",
            data.get("status"),
            f"{origin_lat},{origin_lng}",
            f"{dest_lat},{dest_lng}",
            mode,
        )
    except httpx.TimeoutException:
        logger.error("Directions API timeout for %s route", mode)
    except Exception as e:
        logger.error("Directions API error: %s", e)

    return fallback
