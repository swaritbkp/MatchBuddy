"""
Gemini AI Service — SOS triage, parking analysis, exit advice.

Uses Gemini 2.0 Flash (text) and Gemini 2.0 Flash (vision/multimodal).
All calls are async-safe via ``generate_content_async``.
"""

import base64
import io
import json
import logging
import os

import google.generativeai as genai
from PIL import Image

logger = logging.getLogger(__name__)

# ── Gemini Configuration ────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini API configured successfully")
else:
    logger.warning("GEMINI_API_KEY not set — Gemini calls will use fallback responses")

TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.0-flash")
VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-2.0-flash")


def _get_model(model_name: str = None) -> genai.GenerativeModel:
    """Return a configured Gemini model instance."""
    return genai.GenerativeModel(model_name or TEXT_MODEL)


# ── 1. SOS Triage ───────────────────────────────────────────────────

async def triage(
    emergency_type: str,
    seat_zone: str,
    lat: float,
    lng: float,
    venue_name: str,
) -> dict:
    """
    Generate Gemini AI triage response for an SOS event.

    Returns a dict with ``fan_message`` and ``security_alert``.
    Falls back to safe defaults if Gemini is unavailable or errors.
    """
    fallback = {
        "fan_message": (
            "Stay where you are. A security officer has been alerted "
            "to your location. Keep this screen visible."
        ),
        "security_alert": (
            f"ALERT — {emergency_type.upper()} — {seat_zone} — manual response required"
        ),
    }

    if not GEMINI_API_KEY:
        return fallback

    prompt = f"""\
You are MatchBuddy, an AI safety assistant at {venue_name}.
A fan has triggered a {emergency_type} emergency.
Their location: {seat_zone}, GPS ({lat}, {lng}).

Respond with valid JSON only. No markdown. No explanation.
{{
  "fan_message": "<Calm, specific 2-sentence instruction for the fan. Name the nearest facility type. Do NOT use generic phrases like help is coming. Max 40 words.>",
  "security_alert": "<1-sentence alert for security staff. Include type, zone, time. Max 20 words.>"
}}"""

    try:
        model = _get_model(TEXT_MODEL)
        response = await model.generate_content_async(prompt)

        # Handle content-blocked responses
        if not response.parts:
            logger.warning("Gemini triage response was blocked by safety filters")
            return fallback

        text = response.text.strip()
        # Clean up any markdown fencing Gemini might add
        text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(text)

        if "fan_message" in data and "security_alert" in data:
            return data

        logger.warning("Gemini triage response missing required fields: %s", text[:200])
    except json.JSONDecodeError as e:
        logger.error("Gemini triage returned invalid JSON: %s", e)
    except Exception as e:
        logger.error("Gemini triage call failed: %s", e)

    return fallback


# ── 2. Parking Photo Analysis ───────────────────────────────────────

async def analyze_parking_photo(image_base64: str) -> str:
    """
    Analyze a parking photo with Gemini Vision.

    Returns a short descriptive label of the parking location.
    """
    fallback = "Parking location saved — check photo for details"

    if not GEMINI_API_KEY:
        return fallback

    prompt = """\
Look at this parking lot photo carefully.
Describe exactly where this vehicle is parked in ONE short sentence. \
Mention any visible: floor/level number, pillar color/letter, zone sign, \
row number, or landmark.
Be specific. Maximum 15 words. No filler words."""

    try:
        model = _get_model(VISION_MODEL)
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes))
        response = await model.generate_content_async([prompt, image])

        if not response.parts:
            logger.warning("Gemini Vision response was blocked by safety filters")
            return fallback

        return response.text.strip()
    except Exception as e:
        logger.error("Gemini Vision parking analysis failed: %s", e)

    return fallback


# ── 3. Gate Advice ──────────────────────────────────────────────────

async def gate_advice(gate_times_list: list, venue_name: str) -> str:
    """
    Generate gate selection advice based on routing times.
    """
    fallback = "Proceed to the nearest open gate."

    if not GEMINI_API_KEY:
        return fallback

    gate_times_json = json.dumps(gate_times_list, indent=2)
    prompt = f"""\
A fan is leaving {venue_name} after a cricket match.
Gate options with total time (walk + drive to parking):
{gate_times_json}

Give a 1-sentence exit recommendation.
Name the best gate, state the time saved vs worst option.
Be direct. No filler. Max 25 words."""

    try:
        model = _get_model(TEXT_MODEL)
        response = await model.generate_content_async(prompt)

        if not response.parts:
            logger.warning("Gemini gate advice response was blocked")
            return fallback

        return response.text.strip()
    except Exception as e:
        logger.error("Gemini gate advice call failed: %s", e)

    return fallback


# ── 4. Crowd Exit Advice ────────────────────────────────────────────

async def exit_advice(
    seat_zone: str, gate_density_list: list, venue_name: str
) -> str:
    """
    Personalized exit advice based on seat zone and live crowd density.
    """
    fallback = "Please move towards the nearest exit safely."

    if not GEMINI_API_KEY:
        return fallback

    density_json = json.dumps(gate_density_list, indent=2)
    prompt = f"""\
A fan at {venue_name} is in {seat_zone} and wants to exit.
Current gate crowd levels: {density_json}

Give a 1-sentence personalized exit recommendation.
Name the best gate. Mention crowd level. Max 20 words."""

    try:
        model = _get_model(TEXT_MODEL)
        response = await model.generate_content_async(prompt)

        if not response.parts:
            logger.warning("Gemini exit advice response was blocked")
            return fallback

        return response.text.strip()
    except Exception as e:
        logger.error("Gemini exit advice call failed: %s", e)

    return fallback
