"""End-to-end backend API tests for the Delined blog.

Covers:
- site password gate (drifter + admin passwords)
- /api/auth/login and /api/auth/me
- public list endpoints (drawings/writings/videos/messages)
- admin CRUD for drawings/writings/videos
- message create/approve/delete flow
- NEW: /api/admin/purge-samples (auth-gated, deletes only sample rows)
- NEW: sample content does NOT reappear after backend restart / no-op seed
- settings/images and settings/texts endpoints
"""
import os
import uuid
import time
import subprocess
import requests
import pytest

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://creative-canvas-602.preview.emergentagent.com",
).rstrip("/")

SAMPLE_DRAWING_TITLES = ["moon-rabbit", "study-001", "doodle-pile"]
SAMPLE_WRITING_TITLES = ["newsletter \u2014 winter notes", "small notice"]
SAMPLE_VIDEO_TITLES = ["timelapse-rabbit"]
SAMPLE_MESSAGE_EMAIL = "anon@example.com"


# ---------------- Site password gate ----------------
class TestSitePassword:
    def test_wrong_password_401(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/site/verify-password", json={"password": "nope"})
        assert r.status_code == 401

    def test_empty_password_401(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/site/verify-password", json={"password": ""})
        assert r.status_code == 401

    def test_drifter_password_ok(self, api_client, site_password):
        r = api_client.post(f"{BASE_URL}/api/site/verify-password", json={"password": site_password})
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["role"] == "drifter"
        # drifter must NOT receive a token
        assert "token" not in body

    def test_admin_password_returns_admin_jwt(self, api_client, admin_password, admin_email):
        r = api_client.post(f"{BASE_URL}/api/site/verify-password", json={"password": admin_password})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["role"] == "admin"
        assert isinstance(body.get("token"), str) and len(body["token"]) > 20
        assert body["user"]["email"] == admin_email.lower()
        assert body["user"]["role"] == "admin"
        assert "_id" not in body["user"]
        # Token must actually work against /auth/me
        me = api_client.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {body['token']}"})
        assert me.status_code == 200


# ---------------- Auth login & me ----------------
class TestAuth:
    def test_login_wrong_creds(self, api_client, admin_email):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": admin_email, "password": "wrong"})
        assert r.status_code == 401

    def test_login_success(self, api_client, admin_email, admin_password):
        r = api_client.post(f"{BASE_URL}/api/auth/login", json={"email": admin_email, "password": admin_password})
        assert r.status_code == 200, r.text
        body = r.json()
        assert isinstance(body["token"], str) and len(body["token"]) > 20
        assert body["user"]["email"] == admin_email.lower()
        assert body["user"]["role"] == "admin"
        assert "_id" not in body["user"]
        assert "password_hash" not in body["user"]

    def test_me_unauthorized(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, api_client, admin_headers, admin_email):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == admin_email.lower()
        assert u["role"] == "admin"
        assert "_id" not in u
        assert "password_hash" not in u


# ---------------- Public content lists ----------------
class TestPublicContent:
    def test_list_drawings(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/drawings")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        for it in items:
            assert "_id" not in it

    def test_list_writings(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/writings")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_videos(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/videos")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------------- Messages ----------------
class TestMessages:
    def test_list_public_only_approved(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/messages")
        assert r.status_code == 200
        for it in r.json():
            assert it.get("approved") is True
            assert "_id" not in it

    def test_list_all_requires_admin(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/messages?all=true")
        assert r.status_code == 401

    def test_list_all_with_admin(self, api_client, admin_headers):
        r = api_client.get(f"{BASE_URL}/api/messages?all=true", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_pending_then_approve_then_delete(self, api_client, admin_headers):
        payload = {
            "name": "TEST_tester",
            "email": f"TEST_{uuid.uuid4().hex[:8]}@example.com",
            "website": "",
            "found_via": "pytest",
            "sender_descriptor": "automation",
            "message": "TEST_msg please ignore",
        }
        r = api_client.post(f"{BASE_URL}/api/messages", json=payload)
        assert r.status_code == 200
        m = r.json()
        assert m["approved"] is False
        msg_id = m["id"]

        # not in public list yet
        pub = api_client.get(f"{BASE_URL}/api/messages").json()
        assert not any(x["id"] == msg_id for x in pub)

        # approve
        assert api_client.patch(f"{BASE_URL}/api/messages/{msg_id}/approve").status_code == 401
        r = api_client.patch(f"{BASE_URL}/api/messages/{msg_id}/approve", headers=admin_headers)
        assert r.status_code == 200

        pub = api_client.get(f"{BASE_URL}/api/messages").json()
        assert any(x["id"] == msg_id for x in pub)

        # delete
        r = api_client.delete(f"{BASE_URL}/api/messages/{msg_id}", headers=admin_headers)
        assert r.status_code == 200
        pub = api_client.get(f"{BASE_URL}/api/messages").json()
        assert not any(x["id"] == msg_id for x in pub)


# ---------------- Drawings / writings / videos admin CRUD ----------------
class TestAdminCRUD:
    def test_create_drawing_requires_admin(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/drawings", json={
            "title": "TEST_draw", "date": "01/01/2026",
            "image_path": "https://example.com/a.jpg", "tags": ["test"],
        })
        assert r.status_code == 401

    def test_drawing_crud(self, api_client, admin_headers):
        payload = {"title": "TEST_drawing", "date": "01/01/2026",
                   "image_path": "https://example.com/x.jpg", "tags": ["test"], "description": "TEST"}
        r = api_client.post(f"{BASE_URL}/api/drawings", json=payload, headers=admin_headers)
        assert r.status_code == 200
        did = r.json()["id"]
        assert "_id" not in r.json()
        lst = api_client.get(f"{BASE_URL}/api/drawings").json()
        assert any(x["id"] == did for x in lst)
        assert api_client.delete(f"{BASE_URL}/api/drawings/{did}").status_code == 401
        assert api_client.delete(f"{BASE_URL}/api/drawings/{did}", headers=admin_headers).status_code == 200
        lst = api_client.get(f"{BASE_URL}/api/drawings").json()
        assert not any(x["id"] == did for x in lst)

    def test_writing_crud(self, api_client, admin_headers):
        r = api_client.post(f"{BASE_URL}/api/writings", json={
            "title": "TEST_writing", "date": "01/01/2026",
            "content": "TEST content", "tags": ["t"],
        }, headers=admin_headers)
        assert r.status_code == 200
        wid = r.json()["id"]
        assert api_client.delete(f"{BASE_URL}/api/writings/{wid}").status_code == 401
        assert api_client.delete(f"{BASE_URL}/api/writings/{wid}", headers=admin_headers).status_code == 200

    def test_video_crud(self, api_client, admin_headers):
        r = api_client.post(f"{BASE_URL}/api/videos", json={
            "title": "TEST_video", "date": "01/01/2026",
            "external_url": "https://www.youtube.com/embed/abc",
            "tags": ["t"], "description": "",
        }, headers=admin_headers)
        assert r.status_code == 200
        vid = r.json()["id"]
        assert api_client.delete(f"{BASE_URL}/api/videos/{vid}").status_code == 401
        assert api_client.delete(f"{BASE_URL}/api/videos/{vid}", headers=admin_headers).status_code == 200

    def test_delete_nonexistent(self, api_client, admin_headers):
        r = api_client.delete(f"{BASE_URL}/api/drawings/does-not-exist", headers=admin_headers)
        assert r.status_code == 404


# ---------------- Site settings (images + texts) ----------------
class TestSiteSettings:
    def test_get_images_public(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/settings/images")
        assert r.status_code == 200
        d = r.json()
        for k in ["artist_image_path", "hub_background_path", "disclaimer_button_path", "about_bookmark_path"]:
            assert k in d and isinstance(d[k], str) and d[k]

    def test_put_images_requires_admin(self, api_client):
        r = api_client.put(f"{BASE_URL}/api/settings/images", json={"artist_image_path": "https://example.com/x.jpg"})
        assert r.status_code == 401

    def test_get_texts_public_has_defaults(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/settings/texts")
        assert r.status_code == 200
        d = r.json()
        assert "about" in d and "disclaimer" in d and "contact" in d

    def test_put_texts_requires_admin(self, api_client):
        r = api_client.put(f"{BASE_URL}/api/settings/texts", json={"about": {"heading": "x"}})
        assert r.status_code == 401


# ---------------- NEW: PUT (partial update) endpoints ----------------
class TestPutEndpoints:
    def _make_drawing(self, api_client, admin_headers):
        r = api_client.post(f"{BASE_URL}/api/drawings", json={
            "title": "TEST_put_drawing", "date": "01/01/2026",
            "image_path": "https://example.com/orig.jpg",
            "tags": ["orig-tag"], "description": "orig desc",
        }, headers=admin_headers)
        assert r.status_code == 200
        return r.json()

    def test_put_drawing_requires_admin(self, api_client, admin_headers):
        d = self._make_drawing(api_client, admin_headers)
        r = api_client.put(f"{BASE_URL}/api/drawings/{d['id']}", json={"title": "hax"})
        assert r.status_code == 401
        api_client.delete(f"{BASE_URL}/api/drawings/{d['id']}", headers=admin_headers)

    def test_put_drawing_partial_update(self, api_client, admin_headers):
        d = self._make_drawing(api_client, admin_headers)
        did = d["id"]
        r = api_client.put(f"{BASE_URL}/api/drawings/{did}",
                           json={"title": "TEST_put_drawing_v2", "tags": ["new-tag"]},
                           headers=admin_headers)
        assert r.status_code == 200, r.text
        upd = r.json()
        assert upd["title"] == "TEST_put_drawing_v2"
        assert upd["tags"] == ["new-tag"]
        # Other fields untouched
        assert upd["description"] == "orig desc"
        assert upd["image_path"] == "https://example.com/orig.jpg"
        assert upd["date"] == "01/01/2026"
        assert "_id" not in upd
        # Public GET reflects
        lst = api_client.get(f"{BASE_URL}/api/drawings").json()
        found = next(x for x in lst if x["id"] == did)
        assert found["title"] == "TEST_put_drawing_v2"
        assert found["description"] == "orig desc"
        api_client.delete(f"{BASE_URL}/api/drawings/{did}", headers=admin_headers)

    def test_put_drawing_404(self, api_client, admin_headers):
        r = api_client.put(f"{BASE_URL}/api/drawings/does-not-exist",
                           json={"title": "x"}, headers=admin_headers)
        assert r.status_code == 404

    def test_put_drawing_empty_400(self, api_client, admin_headers):
        d = self._make_drawing(api_client, admin_headers)
        r = api_client.put(f"{BASE_URL}/api/drawings/{d['id']}", json={}, headers=admin_headers)
        assert r.status_code == 400
        api_client.delete(f"{BASE_URL}/api/drawings/{d['id']}", headers=admin_headers)

    def test_put_writing_partial(self, api_client, admin_headers):
        r = api_client.post(f"{BASE_URL}/api/writings", json={
            "title": "TEST_put_writing", "date": "02/02/2026",
            "content": "orig body", "tags": ["a"],
        }, headers=admin_headers)
        wid = r.json()["id"]
        r = api_client.put(f"{BASE_URL}/api/writings/{wid}",
                           json={"content": "new body", "tags": ["b", "c"]},
                           headers=admin_headers)
        assert r.status_code == 200
        upd = r.json()
        assert upd["content"] == "new body"
        assert upd["tags"] == ["b", "c"]
        assert upd["title"] == "TEST_put_writing"
        assert upd["date"] == "02/02/2026"
        # Auth-gate check
        assert api_client.put(f"{BASE_URL}/api/writings/{wid}", json={"title": "x"}).status_code == 401
        api_client.delete(f"{BASE_URL}/api/writings/{wid}", headers=admin_headers)

    def test_put_video_partial(self, api_client, admin_headers):
        r = api_client.post(f"{BASE_URL}/api/videos", json={
            "title": "TEST_put_video", "date": "03/03/2026",
            "external_url": "https://youtube.com/embed/aaa",
            "tags": ["v"], "description": "orig",
        }, headers=admin_headers)
        vid = r.json()["id"]
        r = api_client.put(f"{BASE_URL}/api/videos/{vid}",
                           json={"description": "updated desc",
                                 "external_url": "https://youtube.com/embed/bbb"},
                           headers=admin_headers)
        assert r.status_code == 200
        upd = r.json()
        assert upd["description"] == "updated desc"
        assert upd["external_url"] == "https://youtube.com/embed/bbb"
        assert upd["title"] == "TEST_put_video"
        assert upd["tags"] == ["v"]
        assert api_client.put(f"{BASE_URL}/api/videos/{vid}", json={"title": "x"}).status_code == 401
        api_client.delete(f"{BASE_URL}/api/videos/{vid}", headers=admin_headers)

    def test_put_message_partial_and_approve(self, api_client, admin_headers):
        r = api_client.post(f"{BASE_URL}/api/messages", json={
            "name": "TEST_putmsg", "email": "TEST_putmsg@example.com",
            "website": "", "found_via": "pytest",
            "sender_descriptor": "", "message": "orig text",
        })
        mid = r.json()["id"]
        # Partial edit + toggle approved
        r = api_client.put(f"{BASE_URL}/api/messages/{mid}",
                           json={"message": "edited text", "approved": True},
                           headers=admin_headers)
        assert r.status_code == 200, r.text
        upd = r.json()
        assert upd["message"] == "edited text"
        assert upd["approved"] is True
        assert upd["name"] == "TEST_putmsg"
        assert upd["email"] == "TEST_putmsg@example.com"
        # Now visible on public list
        pub = api_client.get(f"{BASE_URL}/api/messages").json()
        assert any(x["id"] == mid and x["message"] == "edited text" for x in pub)
        # Auth-gate check
        assert api_client.put(f"{BASE_URL}/api/messages/{mid}", json={"message": "x"}).status_code == 401
        api_client.delete(f"{BASE_URL}/api/messages/{mid}", headers=admin_headers)


# ---------------- NEW: purge samples endpoint ----------------
class TestPurgeSamples:
    def test_purge_requires_auth(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/admin/purge-samples")
        assert r.status_code == 401

    def test_purge_with_bad_token(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/admin/purge-samples", headers={"Authorization": "Bearer garbage"})
        assert r.status_code == 401

    def test_purge_ok_and_response_shape(self, api_client, admin_headers):
        r = api_client.post(f"{BASE_URL}/api/admin/purge-samples", headers=admin_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        removed = body.get("removed") or {}
        for k in ["drawings", "writings", "videos", "messages"]:
            assert k in removed and isinstance(removed[k], int)

    def test_purge_only_removes_samples_not_real_content(self, api_client, admin_headers):
        # Seed a real (non-sample) drawing with a name that we control
        real_title = f"TEST_real_keep_{uuid.uuid4().hex[:6]}"
        r = api_client.post(f"{BASE_URL}/api/drawings", json={
            "title": real_title, "date": "01/01/2026",
            "image_path": "https://example.com/keep.jpg", "tags": [], "description": "",
        }, headers=admin_headers)
        assert r.status_code == 200
        did = r.json()["id"]

        # Seed a fake "sample" drawing that matches one of the sample titles exactly
        r = api_client.post(f"{BASE_URL}/api/drawings", json={
            "title": "moon-rabbit", "date": "01/01/2026",
            "image_path": "https://example.com/moon.jpg", "tags": [], "description": "",
        }, headers=admin_headers)
        assert r.status_code == 200
        sample_id = r.json()["id"]

        # Purge
        r = api_client.post(f"{BASE_URL}/api/admin/purge-samples", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["removed"]["drawings"] >= 1

        lst = api_client.get(f"{BASE_URL}/api/drawings").json()
        titles = [x["title"] for x in lst]
        # real drawing should survive
        assert real_title in titles, "purge accidentally deleted a real drawing"
        # sample drawing should be gone
        assert not any(x["id"] == sample_id for x in lst), "purge did not remove sample drawing"
        # cleanup our real drawing
        api_client.delete(f"{BASE_URL}/api/drawings/{did}", headers=admin_headers)

    def test_purge_is_idempotent(self, api_client, admin_headers):
        # After previous purges, running it again should return zeros for all four
        r = api_client.post(f"{BASE_URL}/api/admin/purge-samples", headers=admin_headers)
        assert r.status_code == 200
        removed = r.json()["removed"]
        assert removed == {"drawings": 0, "writings": 0, "videos": 0, "messages": 0}, removed

    def test_samples_do_not_reappear_after_backend_restart(self, api_client, admin_headers):
        # First ensure nothing sample-like exists
        r = api_client.post(f"{BASE_URL}/api/admin/purge-samples", headers=admin_headers)
        assert r.status_code == 200

        # Restart backend via supervisorctl and wait for it to come back up
        try:
            subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True, timeout=30)
        except Exception as e:
            pytest.skip(f"cannot restart backend via supervisor: {e}")

        deadline = time.time() + 45
        up = False
        while time.time() < deadline:
            try:
                if api_client.get(f"{BASE_URL}/api/", timeout=5).status_code == 200:
                    up = True
                    break
            except Exception:
                pass
            time.sleep(1.5)
        assert up, "backend did not come back up after restart"

        # Give startup hooks a beat to finish (seed_admin + no-op seed_sample_content)
        time.sleep(2)

        drawings = api_client.get(f"{BASE_URL}/api/drawings").json()
        writings = api_client.get(f"{BASE_URL}/api/writings").json()
        videos = api_client.get(f"{BASE_URL}/api/videos").json()
        msgs_all = api_client.get(f"{BASE_URL}/api/messages?all=true", headers=admin_headers).json()

        d_titles = [x["title"] for x in drawings]
        w_titles = [x["title"] for x in writings]
        v_titles = [x["title"] for x in videos]
        m_emails = [x.get("email") for x in msgs_all]

        for t in SAMPLE_DRAWING_TITLES:
            assert t not in d_titles, f"sample drawing '{t}' reappeared after restart"
        for t in SAMPLE_WRITING_TITLES:
            assert t not in w_titles, f"sample writing '{t}' reappeared after restart"
        for t in SAMPLE_VIDEO_TITLES:
            assert t not in v_titles, f"sample video '{t}' reappeared after restart"
        assert SAMPLE_MESSAGE_EMAIL not in m_emails, "sample anon message reappeared after restart"
