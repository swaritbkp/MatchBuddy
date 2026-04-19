"""
Firebase Admin SDK Service — Realtime DB, Storage, FCM.

Provides synchronous primitives wrapped in error-handling.
Firebase Admin SDK operations are inherently synchronous; FastAPI
handles them fine for a hackathon-scale app since they're network-bound
and release the GIL during I/O.
"""

import json
import logging
import os

import firebase_admin
from firebase_admin import credentials, db, messaging, storage

logger = logging.getLogger(__name__)

# ── Initialisation ──────────────────────────────────────────────────
_firebase_initialised = False

firebase_creds_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
firebase_db_url = os.getenv("FIREBASE_DATABASE_URL")
firebase_bucket = os.getenv("FIREBASE_STORAGE_BUCKET")

if firebase_creds_json and firebase_db_url:
    try:
        creds_dict = json.loads(firebase_creds_json)
        cred = credentials.Certificate(creds_dict)
        firebase_admin.initialize_app(
            cred,
            {
                "databaseURL": firebase_db_url,
                "storageBucket": firebase_bucket,
            },
        )
        _firebase_initialised = True
        logger.info("Firebase Admin SDK initialised successfully")
    except Exception as e:
        logger.error("Firebase Admin init failed: %s", e)
else:
    logger.warning(
        "Firebase credentials not configured — running in demo mode "
        "(DB operations will be no-ops)"
    )


# ── Synchronous Primitives ──────────────────────────────────────────

def _write_db_sync(path: str, data: dict) -> None:
    db.reference(path).set(data)


def _read_db_sync(path: str):
    return db.reference(path).get()


def _update_db_sync(path: str, data: dict) -> None:
    db.reference(path).update(data)


def _delete_field_sync(path: str) -> None:
    db.reference(path).delete()


def _upload_photo_sync(user_id: str, image_bytes: bytes) -> str:
    bucket = storage.bucket()
    blob = bucket.blob(f"parking/{user_id}.jpg")
    blob.upload_from_string(image_bytes, content_type="image/jpeg")
    blob.make_public()
    return blob.public_url


def _send_fcm_push_sync(token: str, title: str, body: str) -> None:
    if not token or token == "demo_token":
        logger.debug("Skipping FCM for invalid/demo token: %s", token)
        return
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        token=token,
    )
    messaging.send(message)


# ── Public API (error-safe wrappers) ────────────────────────────────

def write_db(path: str, data: dict) -> None:
    """Write data to Firebase RTDB. No-op in demo mode."""
    if not _firebase_initialised:
        logger.debug("write_db skipped (demo mode): %s", path)
        return
    try:
        _write_db_sync(path, data)
    except Exception as e:
        logger.error("Firebase write_db error at %s: %s", path, e)


def read_db(path: str):
    """Read data from Firebase RTDB. Returns None on error or in demo mode."""
    if not _firebase_initialised:
        logger.debug("read_db skipped (demo mode): %s", path)
        return None
    try:
        return _read_db_sync(path)
    except Exception as e:
        logger.error("Firebase read_db error at %s: %s", path, e)
        return None


def update_db(path: str, data: dict) -> None:
    """Update fields at path in Firebase RTDB."""
    if not _firebase_initialised:
        logger.debug("update_db skipped (demo mode): %s", path)
        return
    try:
        _update_db_sync(path, data)
    except Exception as e:
        logger.error("Firebase update_db error at %s: %s", path, e)


def delete_field(path: str) -> None:
    """Delete a node at path in Firebase RTDB."""
    if not _firebase_initialised:
        logger.debug("delete_field skipped (demo mode): %s", path)
        return
    try:
        _delete_field_sync(path)
    except Exception as e:
        logger.error("Firebase delete_field error at %s: %s", path, e)


def upload_photo(user_id: str, image_bytes: bytes) -> str:
    """Upload parking photo to Firebase Storage. Returns public URL or empty string."""
    if not _firebase_initialised:
        logger.debug("upload_photo skipped (demo mode): user=%s", user_id)
        return ""
    try:
        return _upload_photo_sync(user_id, image_bytes)
    except Exception as e:
        logger.error("Firebase upload_photo error for user %s: %s", user_id, e)
        return ""


def send_fcm_push(token: str, title: str, body: str) -> None:
    """Send FCM push notification. Silently fails for invalid tokens."""
    if not _firebase_initialised:
        logger.debug("send_fcm_push skipped (demo mode)")
        return
    try:
        _send_fcm_push_sync(token, title, body)
    except Exception as e:
        logger.error("Firebase send_fcm_push error: %s", e)
