import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import DateField from "./DateField";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * AdminQuickAdd
 * Renders nothing for visitors. For an authenticated admin, renders a small
 * sticky-styled "+ add new" button that toggles an inline form for the given
 * content type (drawing | writing | video).
 *
 * On successful submit it calls onAdded() so the parent page can refresh.
 */
const AdminQuickAdd = ({ type, onAdded }) => {
  const { admin, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Shared form fields (only the relevant ones are rendered per type)
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [content, setContent] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [videoPath, setVideoPath] = useState("");
  const [thumbPath, setThumbPath] = useState("");

  if (!admin || !token) return null;

  const reset = () => {
    setTitle(""); setDate(""); setTags(""); setDescription("");
    setImagePath(""); setContent(""); setExternalUrl(""); setVideoPath(""); setThumbPath("");
  };

  const api = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` },
  });

  const uploadFile = async (file, setter) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setter(data.storage_path);
      toast(`uploaded: ${file.name}`);
    } catch (err) {
      toast("upload failed");
    } finally {
      setUploading(false);
    }
  };

  const todayStr = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${d.getFullYear()}`;
  };

  const submit = async (e) => {
    e?.preventDefault();
    const tagArr = tags.split(",").map(s => s.trim()).filter(Boolean);
    const finalDate = date || todayStr();
    try {
      setBusy(true);
      if (type === "drawing") {
        if (!title || !imagePath) { toast("title and image required"); return; }
        await api.post("/drawings", { title, date: finalDate, image_path: imagePath, tags: tagArr, description });
      } else if (type === "writing") {
        if (!title || !content) { toast("title and content required"); return; }
        await api.post("/writings", { title, date: finalDate, content, tags: tagArr });
      } else if (type === "video") {
        if (!title || (!externalUrl && !videoPath)) { toast("title and either upload or url required"); return; }
        await api.post("/videos", {
          title, date: finalDate,
          external_url: externalUrl || null,
          video_path: videoPath || null,
          thumbnail_path: thumbPath || null,
          tags: tagArr,
          description,
        });
      }
      toast("added ✓");
      reset();
      setOpen(false);
      onAdded?.();
    } catch (err) {
      toast("could not save");
    } finally {
      setBusy(false);
    }
  };

  const FileUpload = ({ label, accept, onPath, testId }) => (
    <label className="pico-btn cursor-pointer inline-block" data-testid={testId}>
      {uploading ? "uploading..." : label}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => uploadFile(e.target.files?.[0], onPath)}
      />
    </label>
  );

  return (
    <div className="mb-4" data-testid={`admin-quick-add-${type}`}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="pico-btn"
          data-testid={`admin-quick-add-open-${type}`}
          title="admin only"
        >
          + add {type}
        </button>
      ) : (
        <div className="sticky-pad sticky-coral p-5" style={{ "--tilt": "-0.5deg" }} data-testid={`admin-quick-add-form-${type}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-pixel uppercase tracking-widest text-sm text-[var(--ink-color)]">
              ✎ quick add — {type}
            </span>
            <button
              type="button"
              onClick={() => { setOpen(false); reset(); }}
              className="font-pixel uppercase tracking-widest text-sm hover:underline"
              data-testid={`admin-quick-add-close-${type}`}
            >
              [×]
            </button>
          </div>

          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="pico-input font-hand"
              placeholder="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid={`quick-${type}-title`}
            />
            <DateField
              value={date}
              onChange={setDate}
              title={`date — defaults to ${todayStr()}`}
              data-testid={`quick-${type}-date`}
            />
            <input
              className="pico-input font-hand md:col-span-2"
              placeholder="tags, comma separated"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              data-testid={`quick-${type}-tags`}
            />

            {type === "drawing" && (
              <>
                <input
                  className="pico-input font-hand md:col-span-2"
                  placeholder="image url or upload below"
                  value={imagePath}
                  onChange={(e) => setImagePath(e.target.value)}
                  data-testid={`quick-${type}-image`}
                />
                <textarea
                  className="pico-input font-hand md:col-span-2 min-h-[60px]"
                  placeholder="description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid={`quick-${type}-desc`}
                />
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <FileUpload label="upload image" accept="image/*" onPath={setImagePath} testId={`quick-${type}-upload`} />
                </div>
              </>
            )}

            {type === "writing" && (
              <textarea
                className="pico-input font-hand md:col-span-2 min-h-[140px]"
                placeholder="write your thoughts here…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                data-testid={`quick-${type}-content`}
              />
            )}

            {type === "video" && (
              <>
                <input
                  className="pico-input font-hand md:col-span-2"
                  placeholder="external embed url (YouTube/Vimeo) — leave empty if uploading"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  data-testid={`quick-${type}-url`}
                />
                <input
                  className="pico-input font-hand"
                  placeholder="uploaded video path (auto-filled)"
                  value={videoPath}
                  onChange={(e) => setVideoPath(e.target.value)}
                  data-testid={`quick-${type}-path`}
                />
                <input
                  className="pico-input font-hand"
                  placeholder="thumbnail url or path"
                  value={thumbPath}
                  onChange={(e) => setThumbPath(e.target.value)}
                  data-testid={`quick-${type}-thumb`}
                />
                <textarea
                  className="pico-input font-hand md:col-span-2 min-h-[60px]"
                  placeholder="description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid={`quick-${type}-desc`}
                />
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <FileUpload label="upload video" accept="video/*" onPath={setVideoPath} testId={`quick-${type}-upload`} />
                  <FileUpload label="upload thumb" accept="image/*" onPath={setThumbPath} testId={`quick-${type}-thumb-upload`} />
                </div>
              </>
            )}

            <div className="md:col-span-2 flex items-center gap-2 mt-2">
              <button
                type="submit"
                className="pico-btn"
                disabled={busy}
                data-testid={`quick-${type}-submit`}
              >
                {busy ? "saving..." : `save ${type}`}
              </button>
              <span className="font-pixel uppercase tracking-widest text-xs text-[var(--ink-soft)]">
                admin only ✦ visible to everyone after save
              </span>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminQuickAdd;
