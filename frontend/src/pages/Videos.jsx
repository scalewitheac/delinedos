import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { NotebookFrame, PageCorner, StickyNote } from "../components/notebook/NotebookShell";
import ProtectedImage, { resolveMediaUrl } from "../components/ProtectedImage";
import AdminQuickAdd from "../components/AdminQuickAdd";
import EditContentDialog from "../components/EditContentDialog";
import { useAuth } from "../context/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VideoPlayer = ({ video, onClose, onNext, hasNext, onEdit, isAdmin }) => {
  const ref = useRef(null);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showCC, setShowCC] = useState(false);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.playbackRate = speed;
      el.loop = loop;
    }
  }, [speed, loop]);

  const isExternal = !!video.external_url;

  const togglePlay = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  };

  return (
    <div className="lightbox-bg" data-testid="video-lightbox" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pico-window w-full max-w-3xl" onContextMenu={(e) => e.preventDefault()}>
        <div className="pico-titlebar">
          <span>{video.title}</span>
          <button className="font-pixel" onClick={onClose} data-testid="video-close-btn">[X]</button>
        </div>
        <div className="p-3 bg-[var(--bg-color)]">
          {isExternal ? (
            <div className="aspect-video">
              <iframe
                title={video.title}
                src={video.external_url}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            <video
              ref={ref}
              src={resolveMediaUrl(video.video_path)}
              className="w-full h-auto max-h-[70vh] bg-black"
              autoPlay
              controls={false}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onContextMenu={(e) => e.preventDefault()}
              controlsList="nodownload noremoteplayback"
            >
              {video.captions_url && <track default kind="captions" src={video.captions_url} label="EN" />}
            </video>
          )}
        </div>
        <div className="border-t-2 border-[var(--ink-color)] bg-[var(--bg-deep)] p-2 flex flex-wrap gap-2 items-center">
          {!isExternal && (
            <>
              <button className="pico-btn" onClick={togglePlay} data-testid="video-playpause-btn">
                {playing ? "pause" : "play"}
              </button>
              <button className="pico-btn" onClick={() => setShowCC((v) => !v)} data-testid="video-cc-btn">
                cc {showCC ? "on" : "off"}
              </button>
              <button
                className="pico-btn"
                onClick={() => setSpeed((s) => (s >= 2 ? 0.5 : s + 0.25))}
                data-testid="video-speed-btn"
              >
                speed × {speed}
              </button>
              <button className="pico-btn" onClick={() => setLoop((v) => !v)} data-testid="video-loop-btn">
                loop {loop ? "on" : "off"}
              </button>
            </>
          )}
          <button
            className="pico-btn ml-auto"
            onClick={onNext}
            disabled={!hasNext}
            data-testid="video-next-btn"
          >
            skip ▶
          </button>
          {isAdmin && (
            <button
              className="pico-btn"
              onClick={onEdit}
              data-testid="video-edit-btn"
            >
              ✎ edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Videos = () => {
  const { admin } = useAuth();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
  const reload = () =>
    axios.get(`${API}/videos`).then((r) => {
      const data = Array.isArray(r.data)
        ? r.data
        : r.data.videos || [];

      setItems(data);

      const preselectId = location.state?.selectId;

      if (preselectId) {
        const picked = data.find((x) => x.id === preselectId);

        if (picked) {
          setOpen(picked);
        }
      }
    });

  reload();

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const inTitle = it.title?.toLowerCase().includes(q);
      const inDate = it.date?.toLowerCase().includes(q);
      const inTags = (it.tags || []).some((t) => t.toLowerCase().includes(q.replace(/^#/, "")));
      return inTitle || inDate || inTags;
    });
  }, [items, query]);

  const openVideo = (v) => setOpen(v);
  const nextVideo = () => {
    if (!open) return;
    const i = filtered.findIndex((x) => x.id === open.id);
    if (i >= 0 && filtered[i + 1]) setOpen(filtered[i + 1]);
  };

  const leftPage = (
    <div className="relative h-full">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-2 tilt-l2">videos</h2>
      <p className="font-hand text-[var(--ink-soft)]">
        click a thumbnail to open the player. shorts, timelapses, scraps.
      </p>
      <div className="mt-8 sticky tilt-r p-4 inline-block">
        <span className="tape" />
        <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">note to self</div>
        <p className="font-hand text-[var(--ink-color)] text-lg mt-1">
          → press the bunny-eared corner to wander forward.
        </p>
      </div>
    </div>
  );

  const rightPage = (
    <div className="relative h-full">
      <AdminQuickAdd type="video" onAdded={reload} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-marker text-3xl text-[var(--ink-color)] tilt-r">reel</h3>
        <span className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">{filtered.length}</span>
      </div>
      <input
        className="pico-input font-hand mb-4"
        placeholder="search title · date · #tag"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-testid="videos-search-input"
      />
      <div className="notebook-scroll overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-5" style={{ maxHeight: "60vh" }}>
        {filtered.map((it, idx) => (
          <StickyNote
            key={it.id}
            tilt={idx % 2 === 0 ? "tilt-l" : "tilt-r"}
            color={idx % 3 === 0 ? "alt" : "default"}
            onClick={() => openVideo(it)}
            dataTestId={`video-thumb-${it.id}`}
          >
            <div className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">{it.date}</div>
            <div className="font-marker text-xl text-[var(--ink-color)] leading-tight">"{it.title}"</div>
            <div className="mt-2 aspect-video bg-[var(--bg-color)] border-2 border-[var(--ink-color)] relative overflow-hidden">
              {it.thumbnail_path ? (
                <ProtectedImage src={it.thumbnail_path} alt={it.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[var(--bg-deep)]" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="pico-btn">▶ play</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(it.tags || []).slice(0, 3).map((t) => (
                <span key={t} className="font-pixel text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">#{t}</span>
              ))}
            </div>
          </StickyNote>
        ))}
        {!filtered.length && <p className="font-hand text-[var(--ink-soft)]">no videos yet.</p>}
      </div>
      <PageCorner onClick={() => filtered[0] && openVideo(filtered[0])} label="play first" />
    </div>
  );

  return (
    <>
      <NotebookFrame leftPage={leftPage} rightPage={rightPage} />
      {open && (
        <VideoPlayer
          video={open}
          onClose={() => setOpen(null)}
          onNext={nextVideo}
          hasNext={filtered.findIndex((x) => x.id === open.id) < filtered.length - 1}
          onEdit={() => { setEditing(open); setOpen(null); }}
          isAdmin={!!admin}
        />
      )}
      {editing && (
        <EditContentDialog
          type="video"
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </>
  );
};

export default Videos;
