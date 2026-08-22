from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Response, Header, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
import io

# -------------------- Setup --------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
SITE_PASSWORD = os.environ.get('SITE_PASSWORD', 'pass')
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
APP_NAME = os.environ.get('APP_NAME', 'delined')
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
MESSAGE_EMAIL = os.environ.get('MESSAGE_EMAIL', '')
EMAIL_FROM = os.environ.get('EMAIL_FROM', 'delined <onboarding@resend.dev>')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# -------------------- Object storage --------------------
storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set — storage disabled")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    if resp.status_code == 403:
        # try reinit
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    if resp.status_code == 403:
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key}, timeout=60
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# -------------------- Auth helpers --------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

# -------------------- Models --------------------
class SitePasswordIn(BaseModel):
    password: str

class LoginIn(BaseModel):
    email: str
    password: str

class DrawingIn(BaseModel):
    title: str
    date: str  # MM/DD/YYYY
    image_path: str  # storage path or external URL
    tags: List[str] = []
    description: Optional[str] = ""

class WritingIn(BaseModel):
    title: str
    date: str
    content: str
    tags: List[str] = []

class VideoIn(BaseModel):
    title: str
    date: str
    video_path: Optional[str] = None  # storage path
    external_url: Optional[str] = None  # youtube/vimeo/tiktok
    thumbnail_path: Optional[str] = None
    tags: List[str] = []
    description: Optional[str] = ""

class MessageIn(BaseModel):
    name: str
    email: str
    website: Optional[str] = ""
    found_via: Optional[str] = ""
    sender_descriptor: Optional[str] = ""
    message: str

class DrawingUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    image_path: Optional[str] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None

class WritingUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None

class VideoUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    video_path: Optional[str] = None
    external_url: Optional[str] = None
    thumbnail_path: Optional[str] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None

class MessageUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    found_via: Optional[str] = None
    sender_descriptor: Optional[str] = None
    message: Optional[str] = None
    approved: Optional[bool] = None

class AdminUserIn(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""

class SiteImagesIn(BaseModel):
    artist_image_path: Optional[str] = None
    hub_background_path: Optional[str] = None
    disclaimer_button_path: Optional[str] = None
    about_bookmark_path: Optional[str] = None

class SiteTextsIn(BaseModel):
    about: Optional[Dict[str, Any]] = None
    disclaimer: Optional[Dict[str, Any]] = None
    contact: Optional[Dict[str, Any]] = None

# -------------------- Email helper --------------------
def send_email(subject: str, html: str, to: Optional[str] = None) -> bool:
    """Send via Resend HTTP API. Silently returns False if not configured."""
    if not RESEND_API_KEY or not MESSAGE_EMAIL:
        logger.info("Email skipped — RESEND_API_KEY or MESSAGE_EMAIL missing")
        return False
    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": EMAIL_FROM,
                "to": [to or MESSAGE_EMAIL],
                "subject": subject,
                "html": html,
            },
            timeout=15,
        )
        if resp.status_code >= 400:
            logger.error(f"Resend error {resp.status_code}: {resp.text}")
            return False
        return True
    except Exception as e:
        logger.error(f"Resend send failed: {e}")
        return False

# -------------------- Routes --------------------
@api_router.get("/")
async def root():
    return {"message": "Creative Journal API"}

@api_router.post("/site/verify-password")
async def verify_site_password(body: SitePasswordIn):
    submitted = body.password or ""
    # Admin password unlocks the gate AND grants an admin JWT in one step.
    if submitted and submitted == ADMIN_PASSWORD:
        admin_email = ADMIN_EMAIL.strip().lower()
        user = await db.users.find_one({"email": admin_email})
        if not user:
            # Fail closed if the admin user hasn't been seeded yet.
            raise HTTPException(status_code=500, detail="admin not seeded")
        token = create_access_token(user["id"], user["email"])
        return {
            "ok": True,
            "role": "admin",
            "token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user.get("name"),
                "role": user.get("role"),
            },
        }
    # Visitor / drifter password just unlocks the site.
    if submitted and submitted == SITE_PASSWORD:
        return {"ok": True, "role": "drifter"}
    raise HTTPException(status_code=401, detail="Incorrect password")

@api_router.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user.get("name"), "role": user.get("role")}}

@api_router.get("/auth/me")
async def auth_me(admin: dict = Depends(get_current_admin)):
    return admin

@api_router.post("/auth/logout")
async def auth_logout(admin: dict = Depends(get_current_admin)):
    return {"ok": True}

# Drawings
@api_router.get("/drawings")
async def list_drawings():
    items = await db.drawings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/drawings")
async def create_drawing(body: DrawingIn, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.drawings.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/drawings/{drawing_id}")
async def delete_drawing(drawing_id: str, admin: dict = Depends(get_current_admin)):
    r = await db.drawings.delete_one({"id": drawing_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

@api_router.put("/drawings/{drawing_id}")
async def update_drawing(drawing_id: str, body: DrawingUpdate, admin: dict = Depends(get_current_admin)):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="no fields to update")
    r = await db.drawings.update_one({"id": drawing_id}, {"$set": payload})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.drawings.find_one({"id": drawing_id}, {"_id": 0})
    return doc

# Writings
@api_router.get("/writings")
async def list_writings():
    items = await db.writings.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/writings")
async def create_writing(body: WritingIn, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.writings.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/writings/{writing_id}")
async def delete_writing(writing_id: str, admin: dict = Depends(get_current_admin)):
    r = await db.writings.delete_one({"id": writing_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

@api_router.put("/writings/{writing_id}")
async def update_writing(writing_id: str, body: WritingUpdate, admin: dict = Depends(get_current_admin)):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="no fields to update")
    r = await db.writings.update_one({"id": writing_id}, {"$set": payload})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.writings.find_one({"id": writing_id}, {"_id": 0})
    return doc

# Videos
@api_router.get("/videos")
async def list_videos():
    items = await db.videos.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/videos")
async def create_video(body: VideoIn, admin: dict = Depends(get_current_admin)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.videos.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/videos/{video_id}")
async def delete_video(video_id: str, admin: dict = Depends(get_current_admin)):
    r = await db.videos.delete_one({"id": video_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

@api_router.put("/videos/{video_id}")
async def update_video(video_id: str, body: VideoUpdate, admin: dict = Depends(get_current_admin)):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="no fields to update")
    r = await db.videos.update_one({"id": video_id}, {"$set": payload})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.videos.find_one({"id": video_id}, {"_id": 0})
    return doc

# Messages
@api_router.get("/messages")
async def list_messages(all: bool = False, authorization: Optional[str] = Header(None)):
    if all:
        # admin only
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        try:
            payload = jwt.decode(authorization[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user = await db.users.find_one({"id": payload["sub"]})
            if not user or user.get("role") != "admin":
                raise HTTPException(status_code=403, detail="Admin only")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        items = await db.messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    else:
        items = await db.messages.find({"approved": True}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items

@api_router.post("/messages")
async def create_message(body: MessageIn):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["approved"] = False
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.messages.insert_one(doc)
    doc.pop("_id", None)

    # Fire-and-forget email notification to the operators inbox
    html = (
        f"<h2>new delined transmission</h2>"
        f"<p><b>from:</b> {doc.get('name')} &lt;{doc.get('email')}&gt;</p>"
        f"<p><b>website / socials:</b> {doc.get('website') or '—'}</p>"
        f"<p><b>found via:</b> {doc.get('found_via') or '—'}</p>"
        f"<p><b>sender descriptor (map):</b> {doc.get('sender_descriptor') or '—'}</p>"
        f"<hr><p style='white-space:pre-wrap'>{doc.get('message')}</p>"
        f"<hr><p><i>received {doc.get('created_at')} — awaiting approval</i></p>"
    )
    send_email(subject=f"delined — note from {doc.get('name')}", html=html)
    return doc

@api_router.patch("/messages/{message_id}/approve")
async def approve_message(message_id: str, admin: dict = Depends(get_current_admin)):
    r = await db.messages.update_one({"id": message_id}, {"$set": {"approved": True}})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

@api_router.delete("/messages/{message_id}")
async def delete_message(message_id: str, admin: dict = Depends(get_current_admin)):
    r = await db.messages.delete_one({"id": message_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

@api_router.put("/messages/{message_id}")
async def update_message(message_id: str, body: MessageUpdate, admin: dict = Depends(get_current_admin)):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="no fields to update")
    r = await db.messages.update_one({"id": message_id}, {"$set": payload})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.messages.find_one({"id": message_id}, {"_id": 0})
    return doc

# Upload
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), admin: dict = Depends(get_current_admin)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{file_id}.{ext}"
    data = await file.read()
    content_type = file.content_type or "application/octet-stream"
    result = put_object(path, data, content_type)
    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": file_id, "storage_path": result["path"], "content_type": content_type}

# Site image settings
DEFAULT_SITE_IMAGES = {
    "artist_image_path": "https://images.pexels.com/photos/29861519/pexels-photo-29861519.jpeg?auto=compress&cs=tinysrgb&w=900",
    "hub_background_path": "https://customer-assets.emergentagent.com/job_creative-canvas-602/artifacts/df20ee9o_15187.jpg",
    "disclaimer_button_path": "https://customer-assets.emergentagent.com/job_creative-canvas-602/artifacts/43b6fv8r_Untitled%20design%20%281%29.png",
    "about_bookmark_path": "https://customer-assets.emergentagent.com/job_creative-canvas-602/artifacts/twxxbarm_Untitled_Artwork.PNG",
}

async def _load_site_images() -> Dict[str, str]:
    doc = await db.settings.find_one({"key": "images"}, {"_id": 0}) or {}
    merged = dict(DEFAULT_SITE_IMAGES)
    for k in DEFAULT_SITE_IMAGES.keys():
        v = doc.get(k)
        if v:
            merged[k] = v
    return merged

@api_router.get("/settings/images")
async def get_site_images():
    return await _load_site_images()

@api_router.put("/settings/images")
async def update_site_images(body: SiteImagesIn, admin: dict = Depends(get_current_admin)):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="no fields to update")
    # only allow known keys, strip whitespace
    update: Dict[str, str] = {}
    for k in DEFAULT_SITE_IMAGES.keys():
        if k in payload:
            v = (payload[k] or "").strip()
            if v:
                update[k] = v
    if not update:
        raise HTTPException(status_code=400, detail="no valid fields to update")
    update["key"] = "images"
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_by"] = admin.get("email")
    await db.settings.update_one({"key": "images"}, {"$set": update}, upsert=True)
    return {"ok": True, "images": await _load_site_images()}

# Backwards-compat: keep old about endpoint as alias
DEFAULT_ARTIST_IMAGE = DEFAULT_SITE_IMAGES["artist_image_path"]

# Site text content (about / disclaimer / contact)
DEFAULT_SITE_TEXTS: Dict[str, Any] = {
    "about": {
        "section_label": "whoami",
        "heading": "a strange diary keeper",
        "bio_paragraphs": [
            "hi. i draw, write, and film small things. this site is a collected mess of those things — a sandbox more than a gallery.",
            "most entries are made in margins, on receipts, between classes, after sleep. i'd rather show the doodle than the polished version.",
            "if you'd like to leave a note, the contact page has a message board. messages are read before being shown.",
        ],
        "signature": "— The author",
        "socials_label": "other notebooks",
        "content_warning_label": "content warning",
        "content_warning_text": "Asking questions while someone is drawing may be distracting. Especially if the questions are consistent, repetitive, and are more critical than inquisitive.",
    },
    "disclaimer": {
        "heading": "Disclaimer",
        "body_paragraphs": [
            "That this site is simply meant to be a personal creative art/writing/media sandbox and overall gallery for its owner.",
            "Consider it another random personal blog on this World Wide Web — with its true meanings and worth being defined only by the one who owns it and likewise decided to share it.",
            "As such — the content within can and WILL change based on the owner's collective whims and focus regarding their interests. Life changes — so does a persons attention and focus on occasion. Whatever you see here isn't meant to be restricted by your own views and interpretations. Or anyone else's.",
            "So while the owner cannot physically stop you from viewing this blog, nor can they force how you think or tell you what to do after you browse the contents within — try to remember that this blog may hold things not suitable for you…or an audience that is younger or more sensitive.",
        ],
        "aka_line": "a.k.a…",
        "warning_lines": [
            "Warning: This blog is 18+. Viewer Discretion is Advised",
            "This blog, isn't a babysitter.",
        ],
        "ps_note": "P.S. — If and when you see any spelling or grammar errors, pretend this is an actual notebook. And remember human error is a thing that applies here. Along with sleep deprivation. Thanks.",
    },
    "contact": {
        "random_questions": [
            "If you were a sticky note, what color would you be and what would you say?",
            "What's the weirdest dream you remember and never told anyone about?",
            "If your handwriting had a personality, how would you describe it?",
            "What's a song you'd play on loop while doodling at 3am?",
            "If this blog were a room, what one object would you leave in it?",
            "What's an opinion you hold that you secretly think no one else does?",
            "Describe yourself using only three random objects from your desk.",
            "What's the last small thing that made you genuinely smile?",
            "If you could leave one footnote in someone else's diary, what would it say?",
            "What's the smell of your favorite memory?",
            "If your week had a soundtrack title, what would it be?",
            "What's a secret hobby you'd start if no one was watching?",
        ],
    },
}

def _deep_merge(defaults: Dict[str, Any], stored: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k, v in defaults.items():
        if isinstance(v, dict):
            out[k] = _deep_merge(v, (stored or {}).get(k) or {})
        else:
            stored_val = (stored or {}).get(k)
            out[k] = stored_val if stored_val not in (None, "") else v
    # carry any extra keys from stored (so admin can add custom fields safely)
    for k, v in (stored or {}).items():
        if k not in out:
            out[k] = v
    return out

async def _load_site_texts() -> Dict[str, Any]:
    doc = await db.settings.find_one({"key": "texts"}, {"_id": 0}) or {}
    stored = doc.get("data") or {}
    return _deep_merge(DEFAULT_SITE_TEXTS, stored)

@api_router.get("/settings/texts")
async def get_site_texts():
    return await _load_site_texts()

@api_router.put("/settings/texts")
async def update_site_texts(body: SiteTextsIn, admin: dict = Depends(get_current_admin)):
    payload = body.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="no fields to update")
    existing = await db.settings.find_one({"key": "texts"}, {"_id": 0}) or {}
    merged_data = _deep_merge(existing.get("data") or {}, payload)
    await db.settings.update_one(
        {"key": "texts"},
        {"$set": {
            "key": "texts",
            "data": merged_data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.get("email"),
        }},
        upsert=True,
    )
    return {"ok": True, "texts": await _load_site_texts()}

@api_router.get("/settings/about")
async def get_about_settings():
    imgs = await _load_site_images()
    return {"artist_image_path": imgs["artist_image_path"]}

@api_router.put("/settings/about")
async def update_about_settings(body: SiteImagesIn, admin: dict = Depends(get_current_admin)):
    path = (body.artist_image_path or "").strip()
    if not path:
        raise HTTPException(status_code=400, detail="artist_image_path required")
    await db.settings.update_one(
        {"key": "images"},
        {"$set": {
            "key": "images",
            "artist_image_path": path,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin.get("email"),
        }},
        upsert=True,
    )
    return {"ok": True, "artist_image_path": path}

# File serving — public (we already gate the whole site with the password screen)
@api_router.get("/files/{path:path}")
async def download_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        # Allow direct fetches for known prefix anyway
        if not path.startswith(f"{APP_NAME}/"):
            raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    record_ct = record.get("content_type", content_type) if record else content_type
    return StreamingResponse(io.BytesIO(data), media_type=record_ct)

# -------------------- Seed & startup --------------------
async def seed_admin():
    # Remove legacy admin (rebrand)
    await db.users.delete_one({"email": "scalewitheac@gmail.com"})

    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})
        logger.info("Updated admin password from env")

async def seed_sample_content():
    # No-op. The site is in active use and sample content is no longer seeded
    # on startup. Kept as an empty function so existing call sites don't break.
    return

# Known sample content identifiers (used only for the /admin/purge-samples cleanup route).
SAMPLE_DRAWING_TITLES = ["moon-rabbit", "study-001", "doodle-pile"]
SAMPLE_WRITING_TITLES = ["newsletter — winter notes", "small notice"]
SAMPLE_VIDEO_TITLES = ["timelapse-rabbit"]
SAMPLE_MESSAGE_MARKERS = [
    {"name": "anon", "email": "anon@example.com"},
]

@api_router.post("/admin/purge-samples")
async def purge_samples(admin: dict = Depends(get_current_admin)):
    """One-shot cleanup. Deletes only the exact sample rows that used to be
    seeded on startup, identified by their unique titles/emails. Any content
    the operator created themselves is left untouched."""
    dr = await db.drawings.delete_many({"title": {"$in": SAMPLE_DRAWING_TITLES}})
    wr = await db.writings.delete_many({"title": {"$in": SAMPLE_WRITING_TITLES}})
    vr = await db.videos.delete_many({"title": {"$in": SAMPLE_VIDEO_TITLES}})
    mr = await db.messages.delete_many({"$or": SAMPLE_MESSAGE_MARKERS})
    return {
        "ok": True,
        "removed": {
            "drawings": dr.deleted_count,
            "writings": wr.deleted_count,
            "videos": vr.deleted_count,
            "messages": mr.deleted_count,
        },
    }

@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.drawings.create_index("created_at")
    await db.writings.create_index("created_at")
    await db.videos.create_index("created_at")
    await db.messages.create_index("created_at")
    await seed_admin()
    await seed_sample_content()
    init_storage()

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
