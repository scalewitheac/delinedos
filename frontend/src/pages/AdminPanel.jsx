import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotebookFrame } from "../components/notebook/NotebookShell";
import { resolveMediaUrl } from "../components/ProtectedImage";
import UploadField from "../components/UploadField";
import EditContentDialog from "../components/EditContentDialog";
import DateField from "../components/DateField";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const useAuthApi = () => {
  const { token } = useAuth();
  return axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` },
  });
};

const Section = ({ title, children }) => (
  <section className="sticky tilt-l mb-6 p-5" data-testid={`admin-section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
    <span className="tape" />
    <h3 className="font-marker text-2xl text-[var(--ink-color)] mb-3">{title}</h3>
    {children}
  </section>
);

const AdminPanel = () => {
  const { admin, token } = useAuth();
  const api = useAuthApi();
  const [messages, setMessages] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [writings, setWritings] = useState([]);
  const [videos, setVideos] = useState([]);

  const [d, setD] = useState({ title: "", date: "", image_path: "", tags: "", description: "" });
  const [w, setW] = useState({ title: "", date: "", content: "", tags: "" });
  const [v, setV] = useState({ title: "", date: "", external_url: "", video_path: "", thumbnail_path: "", tags: "", description: "" });
  const [siteImages, setSiteImages] = useState({
    artist_image_path: "",
    hub_background_path: "",
    disclaimer_button_path: "",
    about_bookmark_path: "",
  });
  const [imgSaving, setImgSaving] = useState({});

  const [siteTexts, setSiteTexts] = useState({
    about: {
      section_label: "", heading: "", bio_paragraphs: [], signature: "",
      socials_label: "", content_warning_label: "", content_warning_text: "",
    },
    disclaimer: {
      heading: "", body_paragraphs: [], aka_line: "",
      warning_lines: [], ps_note: "",
    },
    contact: { random_questions: [] },
  });
  const [textSaving, setTextSaving] = useState({});
  const [purging, setPurging] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [editing, setEditing] = useState({ type: null, item: null });
  const openEdit = (type, item) => setEditing({ type, item });
  const closeEdit = () => setEditing({ type: null, item: null });

  const loadAll = useCallback(async () => {
    const [mr, dr, wr, vr, sr, tr] = await Promise.all([
      api.get(`/messages?all=true`),
      api.get(`/drawings`),
      api.get(`/writings`),
      api.get(`/videos`),
      api.get(`/settings/images`),
      api.get(`/settings/texts`),
    ]);
    setMessages(mr.data); setDrawings(dr.data); setWritings(wr.data); setVideos(vr.data);
    setSiteImages({
      artist_image_path: sr.data?.artist_image_path || "",
      hub_background_path: sr.data?.hub_background_path || "",
      disclaimer_button_path: sr.data?.disclaimer_button_path || "",
      about_bookmark_path: sr.data?.about_bookmark_path || "",
    });
    setSiteTexts({
      about: { ...tr.data?.about },
      disclaimer: { ...tr.data?.disclaimer },
      contact: { ...tr.data?.contact },
    });
    // api is recreated each render but its identity does not affect the
    // logical behaviour of this loader, so it is intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (token) loadAll(); }, [token, loadAll]);

  if (!token) return <Navigate to="/admin/login" replace />;

  const approve = async (id) => { await api.patch(`/messages/${id}/approve`); toast("approved"); loadAll(); };
  const delMsg = async (id) => { await api.delete(`/messages/${id}`); toast("deleted"); loadAll(); };

  const addDrawing = async (e) => {
    e.preventDefault();
    if (!d.title || !d.date || !d.image_path) { toast("title, date, image required"); return; }
    await api.post(`/drawings`, { ...d, tags: d.tags.split(",").map(s => s.trim()).filter(Boolean) });
    setD({ title: "", date: "", image_path: "", tags: "", description: "" });
    toast("added");
    loadAll();
  };
  const addWriting = async (e) => {
    e.preventDefault();
    if (!w.title || !w.date || !w.content) { toast("title, date, content required"); return; }
    await api.post(`/writings`, { ...w, tags: w.tags.split(",").map(s => s.trim()).filter(Boolean) });
    setW({ title: "", date: "", content: "", tags: "" });
    toast("added");
    loadAll();
  };
  const addVideo = async (e) => {
    e.preventDefault();
    if (!v.title || !v.date || (!v.external_url && !v.video_path)) { toast("title, date, and either url or upload required"); return; }
    await api.post(`/videos`, { ...v, tags: v.tags.split(",").map(s => s.trim()).filter(Boolean) });
    setV({ title: "", date: "", external_url: "", video_path: "", thumbnail_path: "", tags: "", description: "" });
    toast("added");
    loadAll();
  };

  const remove = async (col, id) => {
    await api.delete(`/${col}/${id}`);
    toast("removed");
    loadAll();
  };

  const saveSiteImage = async (key) => {
    const path = (siteImages[key] || "").trim();
    if (!path) { toast("paste a url or upload an image first"); return; }
    setImgSaving((s) => ({ ...s, [key]: true }));
    try {
      await api.put(`/settings/images`, { [key]: path });
      toast("image updated");
      loadAll();
    } catch {
      toast("update failed");
    } finally {
      setImgSaving((s) => ({ ...s, [key]: false }));
    }
  };

  const saveTextGroup = async (group) => {
    setTextSaving((s) => ({ ...s, [group]: true }));
    try {
      await api.put(`/settings/texts`, { [group]: siteTexts[group] });
      toast(`${group} text saved`);
      loadAll();
    } catch {
      toast("save failed");
    } finally {
      setTextSaving((s) => ({ ...s, [group]: false }));
    }
  };

  const updateText = (group, key, value) =>
    setSiteTexts((s) => ({ ...s, [group]: { ...s[group], [key]: value } }));
  const updateTextList = (group, key, idx, value) =>
    setSiteTexts((s) => {
      const list = [...(s[group][key] || [])];
      list[idx] = value;
      return { ...s, [group]: { ...s[group], [key]: list } };
    });
  const addTextListItem = (group, key) =>
    setSiteTexts((s) => ({
      ...s,
      [group]: { ...s[group], [key]: [...(s[group][key] || []), ""] },
    }));
  const removeTextListItem = (group, key, idx) =>
    setSiteTexts((s) => {
      const list = [...(s[group][key] || [])];
      list.splice(idx, 1);
      return { ...s, [group]: { ...s[group], [key]: list } };
    });

  const migrateAssets = async (dryRun) => {
    if (!dryRun && !window.confirm("Copy externally-hosted images into your own storage and repoint the site at your copies? Your originals are left where they are; nothing is deleted.")) return;
    setMigrating(true);
    try {
      const { data } = await api.post(`/admin/migrate-assets?dry_run=${dryRun ? "true" : "false"}`);
      if (!data.moved_count) {
        toast("nothing to move — everything is already in your own storage");
      } else if (dryRun) {
        toast(`${data.moved_count} file(s) would move into your storage`);
        console.log("[migrate-assets] would move:", data.moved);
      } else {
        toast(`moved ${data.moved_count} file(s)${data.failed_count ? ` · ${data.failed_count} failed` : ""}`);
        if (data.failed_count) console.warn("[migrate-assets] failed:", data.failed);
        loadAll();
      }
    } catch (e) {
      toast(e?.response?.data?.detail || "migration failed");
    } finally {
      setMigrating(false);
    }
  };

  const generateDerivatives = async (dryRun) => {
    setResizing(true);
    try {
      const { data } = await api.post(`/admin/generate-derivatives?dry_run=${dryRun ? "true" : "false"}`);
      if (!data.generated_count) {
        toast("nothing to resize — every image already has its smaller sizes");
      } else if (dryRun) {
        toast(`${data.generated_count} image(s) would get smaller sizes`);
        console.log("[generate-derivatives] would build:", data.generated);
      } else {
        toast(`resized ${data.generated_count} image(s)${data.failed_count ? ` · ${data.failed_count} failed` : ""}`);
        console.log("[generate-derivatives] built:", data.generated);
        if (data.failed_count) console.warn("[generate-derivatives] failed:", data.failed);
      }
    } catch (e) {
      toast(e?.response?.data?.detail || "resize failed");
    } finally {
      setResizing(false);
    }
  };

  const purgeSamples = async () => {
    if (!window.confirm("Delete the built-in sample drawings / writings / videos / message from the database? This only removes the template rows, not anything you created.")) return;
    setPurging(true);
    try {
      const { data } = await api.post(`/admin/purge-samples`);
      const r = data?.removed || {};
      toast(`purged — drawings ${r.drawings || 0} · writings ${r.writings || 0} · videos ${r.videos || 0} · messages ${r.messages || 0}`);
      loadAll();
    } catch {
      toast("purge failed");
    } finally {
      setPurging(false);
    }
  };

  const page = (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-marker text-5xl text-[var(--ink-color)] tilt-l2">admin panel</h2>
        <span className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
          {admin?.email}
        </span>
      </div>

      <Section title="Site Images">
        <p className="font-hand text-sm text-[var(--ink-soft)] mb-3" data-testid="site-images-section">
          Master controls for every image asset on the site. Paste a URL or upload a new file, then click save for that slot.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { key: "artist_image_path",      label: "About — Artist Photo",       w: "w-36", h: "h-44", aspect: "aspect-[3/4]" },
            { key: "hub_background_path",    label: "Hub — Background (behind Gameboy)", w: "w-44", h: "h-32", aspect: "aspect-[16/10]" },
            { key: "disclaimer_button_path", label: "Disclaimer — “I Understand” Button", w: "w-40", h: "h-32", aspect: "aspect-[5/4]" },
            { key: "about_bookmark_path",    label: "About — Bookmark Logo (top-left ribbon)", w: "w-24", h: "h-24", aspect: "aspect-square" },
          ].map((slot) => {
            const val = siteImages[slot.key] || "";
            return (
              <div key={slot.key} className="border border-[var(--ink-soft)]/30 rounded-md p-3" data-testid={`site-image-card-${slot.key}`}>
                <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-color)] mb-2">{slot.label}</div>
                <div className="flex gap-3 items-start">
                  <div
                    className={`relative bg-[var(--bg-color)] p-2 shrink-0 ${slot.w} ${slot.h} flex items-center justify-center overflow-hidden tilt-l`}
                    style={{ boxShadow: "2px 4px 10px var(--shadow)" }}
                  >
                    {val ? (
                      <img
                        src={resolveMediaUrl(val)}
                        alt={slot.label}
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                        data-testid={`site-image-preview-${slot.key}`}
                      />
                    ) : (
                      <div className="font-pixel text-xs text-[var(--ink-soft)] uppercase tracking-widest text-center">
                        no image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <input
                      className="pico-input font-hand w-full"
                      placeholder="image URL or storage path"
                      value={val}
                      onChange={(e) => setSiteImages((s) => ({ ...s, [slot.key]: e.target.value }))}
                      data-testid={`site-image-input-${slot.key}`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <UploadField
                        label="upload"
                        accept="image/*"
                        testId={`site-image-upload-${slot.key}`}
                        onUploaded={(p) => setSiteImages((s) => ({ ...s, [slot.key]: p }))}
                      />
                      <button
                        type="button"
                        className="pico-btn"
                        onClick={() => saveSiteImage(slot.key)}
                        disabled={!!imgSaving[slot.key]}
                        data-testid={`site-image-save-${slot.key}`}
                      >
                        {imgSaving[slot.key] ? "saving..." : "save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Site Text Content">
        <p className="font-hand text-sm text-[var(--ink-soft)] mb-4" data-testid="site-text-section">
          Master controls for the text content on each page. Edit, add or remove paragraphs/questions then click save for that section.
        </p>

        {/* About */}
        <div className="border border-[var(--ink-soft)]/30 rounded-md p-3 mb-5" data-testid="text-group-about">
          <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-color)] mb-3">about page</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">section label (small caps)</span>
              <input className="pico-input font-hand w-full" data-testid="about-text-section_label"
                value={siteTexts.about.section_label || ""}
                onChange={(e) => updateText("about", "section_label", e.target.value)} />
            </label>
            <label className="block">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">heading</span>
              <input className="pico-input font-hand w-full" data-testid="about-text-heading"
                value={siteTexts.about.heading || ""}
                onChange={(e) => updateText("about", "heading", e.target.value)} />
            </label>
          </div>

          <div className="mt-3">
            <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">bio paragraphs</span>
            {(siteTexts.about.bio_paragraphs || []).map((p, i) => (
              <div key={i} className="flex gap-2 mt-2" data-testid={`about-bio-row-${i}`}>
                <textarea className="pico-textarea font-hand flex-1" rows={2}
                  value={p}
                  onChange={(e) => updateTextList("about", "bio_paragraphs", i, e.target.value)} />
                <button type="button" className="pico-btn text-xs h-fit"
                  onClick={() => removeTextListItem("about", "bio_paragraphs", i)}
                  data-testid={`about-bio-remove-${i}`}>×</button>
              </div>
            ))}
            <button type="button" className="pico-btn text-xs mt-2"
              onClick={() => addTextListItem("about", "bio_paragraphs")}
              data-testid="about-bio-add">+ add paragraph</button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">signature</span>
              <input className="pico-input font-hand w-full" data-testid="about-text-signature"
                value={siteTexts.about.signature || ""}
                onChange={(e) => updateText("about", "signature", e.target.value)} />
            </label>
            <label className="block">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">socials heading</span>
              <input className="pico-input font-hand w-full" data-testid="about-text-socials_label"
                value={siteTexts.about.socials_label || ""}
                onChange={(e) => updateText("about", "socials_label", e.target.value)} />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">content warning label</span>
              <input className="pico-input font-hand w-full" data-testid="about-text-cw_label"
                value={siteTexts.about.content_warning_label || ""}
                onChange={(e) => updateText("about", "content_warning_label", e.target.value)} />
            </label>
            <label className="block md:col-span-2">
              <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">content warning text</span>
              <textarea className="pico-textarea font-hand w-full" rows={2} data-testid="about-text-cw_text"
                value={siteTexts.about.content_warning_text || ""}
                onChange={(e) => updateText("about", "content_warning_text", e.target.value)} />
            </label>
          </div>

          <button type="button" className="pico-btn mt-4"
            onClick={() => saveTextGroup("about")}
            disabled={!!textSaving.about}
            data-testid="about-text-save">
            {textSaving.about ? "saving..." : "save about text"}
          </button>
        </div>

        {/* Disclaimer */}
        <div className="border border-[var(--ink-soft)]/30 rounded-md p-3 mb-5" data-testid="text-group-disclaimer">
          <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-color)] mb-3">disclaimer page</div>

          <label className="block">
            <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">heading</span>
            <input className="pico-input font-hand w-full" data-testid="disclaimer-text-heading"
              value={siteTexts.disclaimer.heading || ""}
              onChange={(e) => updateText("disclaimer", "heading", e.target.value)} />
          </label>

          <div className="mt-3">
            <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">body paragraphs</span>
            {(siteTexts.disclaimer.body_paragraphs || []).map((p, i) => (
              <div key={i} className="flex gap-2 mt-2" data-testid={`disclaimer-body-row-${i}`}>
                <textarea className="pico-textarea font-hand flex-1" rows={3}
                  value={p}
                  onChange={(e) => updateTextList("disclaimer", "body_paragraphs", i, e.target.value)} />
                <button type="button" className="pico-btn text-xs h-fit"
                  onClick={() => removeTextListItem("disclaimer", "body_paragraphs", i)}
                  data-testid={`disclaimer-body-remove-${i}`}>×</button>
              </div>
            ))}
            <button type="button" className="pico-btn text-xs mt-2"
              onClick={() => addTextListItem("disclaimer", "body_paragraphs")}
              data-testid="disclaimer-body-add">+ add paragraph</button>
          </div>

          <label className="block mt-3">
            <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">a.k.a line</span>
            <input className="pico-input font-hand w-full" data-testid="disclaimer-text-aka_line"
              value={siteTexts.disclaimer.aka_line || ""}
              onChange={(e) => updateText("disclaimer", "aka_line", e.target.value)} />
          </label>

          <div className="mt-3">
            <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">warning lines (bold, centered)</span>
            {(siteTexts.disclaimer.warning_lines || []).map((p, i) => (
              <div key={i} className="flex gap-2 mt-2" data-testid={`disclaimer-warn-row-${i}`}>
                <input className="pico-input font-hand flex-1"
                  value={p}
                  onChange={(e) => updateTextList("disclaimer", "warning_lines", i, e.target.value)} />
                <button type="button" className="pico-btn text-xs h-fit"
                  onClick={() => removeTextListItem("disclaimer", "warning_lines", i)}
                  data-testid={`disclaimer-warn-remove-${i}`}>×</button>
              </div>
            ))}
            <button type="button" className="pico-btn text-xs mt-2"
              onClick={() => addTextListItem("disclaimer", "warning_lines")}
              data-testid="disclaimer-warn-add">+ add line</button>
          </div>

          <label className="block mt-3">
            <span className="font-pixel uppercase text-[10px] text-[var(--ink-soft)]">P.S. note</span>
            <textarea className="pico-textarea font-hand w-full" rows={3} data-testid="disclaimer-text-ps_note"
              value={siteTexts.disclaimer.ps_note || ""}
              onChange={(e) => updateText("disclaimer", "ps_note", e.target.value)} />
          </label>

          <button type="button" className="pico-btn mt-4"
            onClick={() => saveTextGroup("disclaimer")}
            disabled={!!textSaving.disclaimer}
            data-testid="disclaimer-text-save">
            {textSaving.disclaimer ? "saving..." : "save disclaimer text"}
          </button>
        </div>

        {/* Contact / Message Board random questions */}
        <div className="border border-[var(--ink-soft)]/30 rounded-md p-3" data-testid="text-group-contact">
          <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-color)] mb-3">message board · random question pool</div>
          <p className="font-hand text-sm text-[var(--ink-soft)] mb-2">
            One of these is picked at random each time a visitor opens the message board.
          </p>
          {(siteTexts.contact.random_questions || []).map((p, i) => (
            <div key={i} className="flex gap-2 mt-2" data-testid={`contact-q-row-${i}`}>
              <input className="pico-input font-hand flex-1"
                value={p}
                onChange={(e) => updateTextList("contact", "random_questions", i, e.target.value)} />
              <button type="button" className="pico-btn text-xs h-fit"
                onClick={() => removeTextListItem("contact", "random_questions", i)}
                data-testid={`contact-q-remove-${i}`}>×</button>
            </div>
          ))}
          <button type="button" className="pico-btn text-xs mt-2"
            onClick={() => addTextListItem("contact", "random_questions")}
            data-testid="contact-q-add">+ add question</button>

          <button type="button" className="pico-btn mt-4 ml-2"
            onClick={() => saveTextGroup("contact")}
            disabled={!!textSaving.contact}
            data-testid="contact-text-save">
            {textSaving.contact ? "saving..." : "save questions"}
          </button>
        </div>
      </Section>

      <Section title="Maintenance">
        <div className="flex flex-wrap items-start gap-4">
          <div className="max-w-lg">
            <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-color)] mb-1">purge sample content</div>
            <p className="font-hand text-sm text-[var(--ink-soft)]">
              Removes only the built-in template drawings, writings, video, and message that used to seed on startup. Anything you created is untouched. Safe to run any time.
            </p>
          </div>
          <button
            type="button"
            className="pico-btn"
            onClick={purgeSamples}
            disabled={purging}
            data-testid="purge-samples-btn"
          >
            {purging ? "purging..." : "purge sample content"}
          </button>
        </div>

        <div className="flex flex-wrap items-start gap-4 mt-6 pt-6 border-t border-[var(--ink-soft)]">
          <div className="max-w-lg">
            <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-color)] mb-1">bring external images into your own storage</div>
            <p className="font-hand text-sm text-[var(--ink-soft)]">
              Some images are still loaded from someone else's server and would break if that host goes away. This copies them into your own bucket and repoints the site at your copies. Check first shows what would move without changing anything. Safe to run more than once.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="pico-btn"
              onClick={() => migrateAssets(true)}
              disabled={migrating}
              data-testid="migrate-assets-check-btn"
            >
              {migrating ? "working..." : "check what would move"}
            </button>
            <button
              type="button"
              className="pico-btn"
              onClick={() => migrateAssets(false)}
              disabled={migrating}
              data-testid="migrate-assets-btn"
            >
              {migrating ? "working..." : "move them into my storage"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-4 mt-6 pt-6 border-t border-[var(--ink-soft)]">
          <div className="max-w-lg">
            <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-color)] mb-1">make smaller copies of your images</div>
            <p className="font-hand text-sm text-[var(--ink-soft)]">
              Pages currently load full-size images even for small thumbnails, which is slow on a phone. This makes small and medium copies so the site loads the right one. Your originals are untouched and still used full-size when an image is opened. Safe to run more than once.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" className="pico-btn" onClick={() => generateDerivatives(true)} disabled={resizing} data-testid="generate-derivatives-check-btn">
              {resizing ? "working..." : "check what needs resizing"}
            </button>
            <button type="button" className="pico-btn" onClick={() => generateDerivatives(false)} disabled={resizing} data-testid="generate-derivatives-btn">
              {resizing ? "working..." : "make the smaller copies"}
            </button>
          </div>
        </div>
      </Section>

      <Section title="Messages">
        <div className="space-y-3 max-h-[40vh] overflow-y-auto notebook-scroll pr-2">
          {messages.length === 0 && <p className="font-hand text-[var(--ink-soft)]">no messages.</p>}
          {messages.map((m) => (
            <div key={m.id} className="border-2 border-[var(--ink-color)] p-3 bg-[var(--bg-color)]" data-testid={`admin-msg-${m.id}`}>
              <div className="flex items-baseline justify-between">
                <div className="font-marker text-lg">{m.name} <span className="font-pixel text-xs text-[var(--ink-soft)] uppercase tracking-widest">{m.email}</span></div>
                <span className={`font-pixel uppercase text-xs tracking-widest ${m.approved ? "text-[var(--ink-color)]" : "text-[var(--margin-color)]"}`}>
                  {m.approved ? "approved" : "pending"}
                </span>
              </div>
              <p className="font-hand whitespace-pre-wrap mt-1">{m.message}</p>
              <div className="font-hand text-xs text-[var(--ink-soft)] mt-1">
                {m.website && <>site: {m.website} · </>}{m.found_via && <>found via: {m.found_via} · </>}{m.sender_descriptor && <>map: {m.sender_descriptor}</>}
              </div>
              <div className="mt-2 flex gap-2">
                {!m.approved && <button className="pico-btn" onClick={() => approve(m.id)} data-testid={`approve-msg-${m.id}`}>approve</button>}
                <button className="pico-btn" onClick={() => openEdit("message", m)} data-testid={`edit-msg-${m.id}`}>edit</button>
                <button className="pico-btn" onClick={() => delMsg(m.id)} data-testid={`delete-msg-${m.id}`}>delete</button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Add Drawing">
        <form onSubmit={addDrawing} className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="add-drawing-form">
          <input className="pico-input font-hand" placeholder="title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} data-testid="drawing-title-input" />
          <DateField value={d.date} onChange={(val) => setD({ ...d, date: val })} data-testid="drawing-date-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="image storage_path or URL" value={d.image_path} onChange={(e) => setD({ ...d, image_path: e.target.value })} data-testid="drawing-image-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="tags (comma separated)" value={d.tags} onChange={(e) => setD({ ...d, tags: e.target.value })} data-testid="drawing-tags-input" />
          <textarea className="pico-input font-hand sm:col-span-2 min-h-[60px]" placeholder="description" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} data-testid="drawing-desc-input" />
          <div className="sm:col-span-2 flex gap-2">
            <UploadField label="upload image" accept="image/*" testId="drawing-upload-btn" onUploaded={(p) => setD((cur) => ({ ...cur, image_path: p }))} />
            <button type="submit" className="pico-btn" data-testid="drawing-submit-btn">add drawing</button>
          </div>
        </form>
        <div className="mt-3 max-h-32 overflow-y-auto notebook-scroll text-sm">
          {drawings.map((it) => (
            <div key={it.id} className="flex items-center justify-between border-b border-[var(--ink-soft)] py-1">
              <span className="font-hand">{it.date} · "{it.title}"</span>
              <span className="flex gap-1">
                <button className="pico-btn" onClick={() => openEdit("drawing", it)} data-testid={`edit-drawing-${it.id}`}>edit</button>
                <button className="pico-btn" onClick={() => remove("drawings", it.id)} data-testid={`del-drawing-${it.id}`}>×</button>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Add Writing">
        <form onSubmit={addWriting} className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="add-writing-form">
          <input className="pico-input font-hand" placeholder="title" value={w.title} onChange={(e) => setW({ ...w, title: e.target.value })} data-testid="writing-title-input" />
          <DateField value={w.date} onChange={(val) => setW({ ...w, date: val })} data-testid="writing-date-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="tags (comma separated)" value={w.tags} onChange={(e) => setW({ ...w, tags: e.target.value })} data-testid="writing-tags-input" />
          <textarea className="pico-input font-hand sm:col-span-2 min-h-[140px]" placeholder="content" value={w.content} onChange={(e) => setW({ ...w, content: e.target.value })} data-testid="writing-content-input" />
          <div className="sm:col-span-2"><button type="submit" className="pico-btn" data-testid="writing-submit-btn">add writing</button></div>
        </form>
        <div className="mt-3 max-h-32 overflow-y-auto notebook-scroll text-sm">
          {writings.map((it) => (
            <div key={it.id} className="flex items-center justify-between border-b border-[var(--ink-soft)] py-1">
              <span className="font-hand">{it.date} · "{it.title}"</span>
              <span className="flex gap-1">
                <button className="pico-btn" onClick={() => openEdit("writing", it)} data-testid={`edit-writing-${it.id}`}>edit</button>
                <button className="pico-btn" onClick={() => remove("writings", it.id)} data-testid={`del-writing-${it.id}`}>×</button>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Add Video">
        <form onSubmit={addVideo} className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="add-video-form">
          <input className="pico-input font-hand" placeholder="title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} data-testid="video-title-input" />
          <DateField value={v.date} onChange={(val) => setV({ ...v, date: val })} data-testid="video-date-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="external url (paste any youtube/vimeo link) — leave empty if uploading" value={v.external_url} onChange={(e) => setV({ ...v, external_url: e.target.value })} data-testid="video-url-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="video storage_path (filled by upload)" value={v.video_path} onChange={(e) => setV({ ...v, video_path: e.target.value })} data-testid="video-path-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="thumbnail storage_path or URL" value={v.thumbnail_path} onChange={(e) => setV({ ...v, thumbnail_path: e.target.value })} data-testid="video-thumb-input" />
          <input className="pico-input font-hand sm:col-span-2" placeholder="tags (comma separated)" value={v.tags} onChange={(e) => setV({ ...v, tags: e.target.value })} data-testid="video-tags-input" />
          <textarea className="pico-input font-hand sm:col-span-2 min-h-[60px]" placeholder="description" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} data-testid="video-desc-input" />
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <UploadField label="upload video" accept="video/*" testId="video-upload-btn" onUploaded={(p) => setV((cur) => ({ ...cur, video_path: p }))} />
            <UploadField label="upload thumbnail" accept="image/*" testId="video-thumb-upload-btn" onUploaded={(p) => setV((cur) => ({ ...cur, thumbnail_path: p }))} />
            <button type="submit" className="pico-btn" data-testid="video-submit-btn">add video</button>
          </div>
        </form>
        <div className="mt-3 max-h-32 overflow-y-auto notebook-scroll text-sm">
          {videos.map((it) => (
            <div key={it.id} className="flex items-center justify-between border-b border-[var(--ink-soft)] py-1">
              <span className="font-hand">{it.date} · "{it.title}"</span>
              <span className="flex gap-1">
                <button className="pico-btn" onClick={() => openEdit("video", it)} data-testid={`edit-video-${it.id}`}>edit</button>
                <button className="pico-btn" onClick={() => remove("videos", it.id)} data-testid={`del-video-${it.id}`}>×</button>
              </span>
            </div>
          ))}
        </div>
      </Section>

      {editing.item && (
        <EditContentDialog
          type={editing.type}
          item={editing.item}
          onClose={closeEdit}
          onSaved={() => { closeEdit(); loadAll(); }}
        />
      )}
    </div>
  );

  return <NotebookFrame single>{page}</NotebookFrame>;
};

export default AdminPanel;
