import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { resolveMediaUrl } from "./ProtectedImage";
import UploadField from "./UploadField";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/*
 * Reusable edit modal for admin-only in-place editing of a drawing / writing /
 * video / message. Fields shown per `type`:
 *   drawing: title, date, image_path (URL or upload), tags, description
 *   writing: title, date, content, tags
 *   video:   title, date, external_url, video_path (URL or upload),
 *            thumbnail_path (URL or upload), tags, description
 *   message: name, email, message, approved
 */
const EditContentDialog = ({ type, item, onClose, onSaved }) => {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setForm({
      title: item.title || "",
      date: item.date || "",
      image_path: item.image_path || "",
      video_path: item.video_path || "",
      external_url: item.external_url || "",
      thumbnail_path: item.thumbnail_path || "",
      content: item.content || "",
      description: item.description || "",
      tags: Array.isArray(item.tags) ? item.tags.join(", ") : "",
      name: item.name || "",
      email: item.email || "",
      message: item.message || "",
      approved: item.approved,
    });
  }, [item]);

  if (!item) return null;

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const token = localStorage.getItem("delined-admin-token") || localStorage.getItem("admin-token");
    if (!token) { toast("not signed in"); return; }
    const headers = { Authorization: `Bearer ${token}` };
    const tagsArr = (form.tags || "")
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    let payload = {};
    if (type === "drawing") {
      payload = {
        title: form.title, date: form.date,
        image_path: form.image_path, description: form.description,
        tags: tagsArr,
      };
    } else if (type === "writing") {
      payload = {
        title: form.title, date: form.date,
        content: form.content, tags: tagsArr,
      };
    } else if (type === "video") {
      payload = {
        title: form.title, date: form.date,
        external_url: form.external_url || null,
        video_path: form.video_path || null,
        thumbnail_path: form.thumbnail_path || null,
        description: form.description, tags: tagsArr,
      };
    } else if (type === "message") {
      payload = {
        name: form.name, email: form.email, message: form.message,
        approved: form.approved,
      };
    }

    setSaving(true);
    try {
      const url = `${API}/${type === "drawing" ? "drawings" : type === "writing" ? "writings" : type === "video" ? "videos" : "messages"}/${item.id}`;
      const { data } = await axios.put(url, payload, { headers });
      toast(`${type} updated`);
      onSaved && onSaved(data);
      onClose && onClose();
    } catch (e) {
      toast(e?.response?.data?.detail || "save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="lightbox-bg"
      data-testid={`edit-${type}-dialog`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <div className="pico-window w-full max-w-2xl">
        <div className="pico-titlebar">
          <span>edit {type}</span>
          <button className="font-pixel" onClick={onClose} data-testid={`edit-${type}-close`}>[X]</button>
        </div>
        <div className="p-4 bg-[var(--bg-color)] max-h-[70vh] overflow-y-auto space-y-3">
          {(type === "drawing" || type === "writing" || type === "video") && (
            <>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">title</span>
                <input className="pico-input font-hand w-full" data-testid={`edit-${type}-title`}
                  value={form.title || ""}
                  onChange={(e) => setField("title", e.target.value)} />
              </label>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">date</span>
                <input className="pico-input font-hand w-full" data-testid={`edit-${type}-date`}
                  placeholder="MM/DD/YYYY"
                  value={form.date || ""}
                  onChange={(e) => setField("date", e.target.value)} />
              </label>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">tags (comma separated, without #)</span>
                <input className="pico-input font-hand w-full" data-testid={`edit-${type}-tags`}
                  placeholder="sketch, portrait, ink"
                  value={form.tags || ""}
                  onChange={(e) => setField("tags", e.target.value)} />
              </label>
            </>
          )}

          {type === "drawing" && (
            <>
              <div className="flex gap-3 items-start">
                <div className="w-28 h-28 bg-[var(--bg-deep)] flex items-center justify-center overflow-hidden border">
                  {form.image_path ? (
                    <img src={resolveMediaUrl(form.image_path)} alt="" className="max-w-full max-h-full object-contain" />
                  ) : <span className="font-pixel text-xs text-[var(--ink-soft)]">no image</span>}
                </div>
                <div className="flex-1">
                  <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">image URL / storage path</span>
                  <input className="pico-input font-hand w-full" data-testid={`edit-${type}-image`}
                    value={form.image_path || ""}
                    onChange={(e) => setField("image_path", e.target.value)} />
                  <div className="mt-2">
                    <UploadField label="upload new image" accept="image/*" testId={`edit-${type}-image-upload`}
                      onUploaded={(p) => setField("image_path", p)} />
                  </div>
                </div>
              </div>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">description</span>
                <textarea className="pico-textarea font-hand w-full" rows={2} data-testid={`edit-${type}-description`}
                  value={form.description || ""}
                  onChange={(e) => setField("description", e.target.value)} />
              </label>
            </>
          )}

          {type === "writing" && (
            <label className="block">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">content</span>
              <textarea className="pico-textarea font-hand w-full" rows={10} data-testid={`edit-${type}-content`}
                value={form.content || ""}
                onChange={(e) => setField("content", e.target.value)} />
            </label>
          )}

          {type === "video" && (
            <>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">
                  external url (youtube/vimeo/tiktok embed) — leave empty if uploading a file
                </span>
                <input className="pico-input font-hand w-full" data-testid={`edit-${type}-externalurl`}
                  value={form.external_url || ""}
                  onChange={(e) => setField("external_url", e.target.value)} />
              </label>
              <div className="flex gap-3 items-start">
                <div className="w-28 h-20 bg-[var(--bg-deep)] flex items-center justify-center overflow-hidden border">
                  {form.thumbnail_path ? (
                    <img src={resolveMediaUrl(form.thumbnail_path)} alt="" className="max-w-full max-h-full object-contain" />
                  ) : <span className="font-pixel text-[10px] text-[var(--ink-soft)]">no thumb</span>}
                </div>
                <div className="flex-1">
                  <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">thumbnail url / storage path</span>
                  <input className="pico-input font-hand w-full" data-testid={`edit-${type}-thumb`}
                    value={form.thumbnail_path || ""}
                    onChange={(e) => setField("thumbnail_path", e.target.value)} />
                  <div className="mt-2">
                    <UploadField label="upload new thumb" accept="image/*" testId={`edit-${type}-thumb-upload`}
                      onUploaded={(p) => setField("thumbnail_path", p)} />
                  </div>
                </div>
              </div>
              <div>
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">video file (upload new to swap)</span>
                <div className="flex gap-2 items-center mt-1">
                  <input className="pico-input font-hand flex-1" data-testid={`edit-${type}-videopath`}
                    value={form.video_path || ""}
                    onChange={(e) => setField("video_path", e.target.value)} />
                  <UploadField label="upload video" accept="video/*" testId={`edit-${type}-video-upload`}
                    onUploaded={(p) => setField("video_path", p)} />
                </div>
              </div>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">description</span>
                <textarea className="pico-textarea font-hand w-full" rows={2} data-testid={`edit-${type}-description`}
                  value={form.description || ""}
                  onChange={(e) => setField("description", e.target.value)} />
              </label>
            </>
          )}

          {type === "message" && (
            <>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">from name</span>
                <input className="pico-input font-hand w-full" data-testid={`edit-${type}-name`}
                  value={form.name || ""}
                  onChange={(e) => setField("name", e.target.value)} />
              </label>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">email</span>
                <input className="pico-input font-hand w-full" data-testid={`edit-${type}-email`}
                  value={form.email || ""}
                  onChange={(e) => setField("email", e.target.value)} />
              </label>
              <label className="block">
                <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">message</span>
                <textarea className="pico-textarea font-hand w-full" rows={5} data-testid={`edit-${type}-message`}
                  value={form.message || ""}
                  onChange={(e) => setField("message", e.target.value)} />
              </label>
              <label className="flex items-center gap-2 font-hand">
                <input type="checkbox" checked={!!form.approved}
                  onChange={(e) => setField("approved", e.target.checked)}
                  data-testid={`edit-${type}-approved`} />
                approved (publicly visible on the message board)
              </label>
            </>
          )}
        </div>

        <div className="border-t-2 border-[var(--ink-color)] bg-[var(--bg-deep)] p-2 flex justify-end gap-2">
          <button className="pico-btn" onClick={onClose} data-testid={`edit-${type}-cancel`}>cancel</button>
          <button className="pico-btn" onClick={save} disabled={saving} data-testid={`edit-${type}-save`}>
            {saving ? "saving..." : "save changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditContentDialog;
