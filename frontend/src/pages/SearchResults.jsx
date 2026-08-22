import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { NotebookFrame, StickyNote } from "../components/notebook/NotebookShell";
import ProtectedImage from "../components/ProtectedImage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const matches = (it, q, tagTokens, fields) => {
  const qLower = q.toLowerCase();
  if (tagTokens.length) {
    return tagTokens.every((t) => (it.tags || []).map((x) => x.toLowerCase()).includes(t));
  }
  return fields.some((f) => (it[f] || "").toString().toLowerCase().includes(qLower));
};

const SearchResults = () => {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [drawings, setDrawings] = useState([]);
  const [writings, setWritings] = useState([]);
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/drawings`).then((r) => setDrawings(r.data)).catch(() => {});
    axios.get(`${API}/writings`).then((r) => setWritings(r.data)).catch(() => {});
    axios.get(`${API}/videos`).then((r) => setVideos(r.data)).catch(() => {});
  }, []);

  const parsed = useMemo(() => {
    const raw = q.trim();
    const tokens = raw.toLowerCase().split(/[\s,]+/).filter(Boolean);
    const tagTokens = tokens.filter((t) => t.startsWith("#")).map((t) => t.slice(1));
    return { raw, tagTokens };
  }, [q]);

  const matchedDrawings = useMemo(() => {
    if (!parsed.raw) return [];
    return drawings.filter((it) => matches(it, parsed.raw, parsed.tagTokens, ["title", "date", "description"]));
  }, [drawings, parsed]);

  const matchedWritings = useMemo(() => {
    if (!parsed.raw) return [];
    return writings.filter((it) => matches(it, parsed.raw, parsed.tagTokens, ["title", "date", "content"]));
  }, [writings, parsed]);

  const matchedVideos = useMemo(() => {
    if (!parsed.raw) return [];
    return videos.filter((it) => matches(it, parsed.raw, parsed.tagTokens, ["title", "date", "description"]));
  }, [videos, parsed]);

  const total = matchedDrawings.length + matchedWritings.length + matchedVideos.length;

  const submit = (e) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const leftPage = (
    <div className="relative h-full">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-3 tilt-l2">search</h2>
      <form onSubmit={submit} className="flex gap-2 items-center mb-4">
        <input
          className="pico-input font-hand flex-1"
          placeholder="e.g. #sketch  or  rabbit  or  02/14/2026"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="search-input"
          autoFocus
        />
        <button type="submit" className="pico-btn" data-testid="search-submit">go</button>
      </form>
      <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
        {parsed.raw ? `${total} result${total === 1 ? "" : "s"} for "${parsed.raw}"` : "type a query to begin"}
      </div>
      <p className="font-hand text-[var(--ink-soft)] mt-4 text-sm max-w-md">
        Tips: use <code className="font-pixel">#tagname</code> for tag-only matches. Multiple tags work as AND
        (e.g. <code className="font-pixel">#sketch #rabbit</code>). Otherwise search matches titles, dates,
        writings' text, drawing/video descriptions.
      </p>
    </div>
  );

  const rightPage = (
    <div className="relative h-full">
      <div
        className="notebook-scroll overflow-y-auto pr-2 space-y-6"
        style={{ maxHeight: "70vh" }}
        data-testid="search-results"
      >
        {parsed.raw && total === 0 && (
          <p className="font-hand text-[var(--ink-soft)]">no results. try a different word or tag.</p>
        )}

        {matchedDrawings.length > 0 && (
          <div>
            <h3 className="font-marker text-2xl text-[var(--ink-color)] tilt-r mb-2">drawings · {matchedDrawings.length}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {matchedDrawings.map((it, i) => (
                <Link key={it.id} to="/drawings" state={{ selectId: it.id }} className="block">
                  <StickyNote
                    tilt={i % 2 === 0 ? "tilt-l" : "tilt-r"}
                    color={i % 3 === 0 ? "alt" : "default"}
                    dataTestId={`search-drawing-${it.id}`}
                  >
                    <div className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">{it.date}</div>
                    <div className="font-marker text-lg text-[var(--ink-color)] leading-tight">"{it.title}"</div>
                    {it.image_path && (
                      <div className="mt-2 aspect-[4/3] bg-[var(--bg-color)] border-2 border-[var(--ink-color)] overflow-hidden">
                        <ProtectedImage src={it.image_path} alt={it.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(it.tags || []).slice(0, 4).map((t) => (
                        <span key={t} className="font-pixel text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">#{t}</span>
                      ))}
                    </div>
                  </StickyNote>
                </Link>
              ))}
            </div>
          </div>
        )}

        {matchedWritings.length > 0 && (
          <div>
            <h3 className="font-marker text-2xl text-[var(--ink-color)] tilt-r mb-2">writings · {matchedWritings.length}</h3>
            <div className="space-y-3">
              {matchedWritings.map((it, i) => (
                <Link key={it.id} to="/writings" state={{ selectId: it.id }} className="block">
                  <StickyNote
                    tilt={i % 2 === 0 ? "tilt-l" : "tilt-r"}
                    color={i % 2 === 0 ? "default" : "alt"}
                    dataTestId={`search-writing-${it.id}`}
                  >
                    <div className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">{it.date}</div>
                    <div className="font-marker text-lg text-[var(--ink-color)] leading-tight">"{it.title}"</div>
                    <p className="font-hand text-sm text-[var(--ink-soft)] mt-1 line-clamp-2">
                      {(it.content || "").slice(0, 140)}…
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(it.tags || []).slice(0, 4).map((t) => (
                        <span key={t} className="font-pixel text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">#{t}</span>
                      ))}
                    </div>
                  </StickyNote>
                </Link>
              ))}
            </div>
          </div>
        )}

        {matchedVideos.length > 0 && (
          <div>
            <h3 className="font-marker text-2xl text-[var(--ink-color)] tilt-r mb-2">videos · {matchedVideos.length}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {matchedVideos.map((it, i) => (
                <Link key={it.id} to="/videos" state={{ selectId: it.id }} className="block">
                  <StickyNote
                    tilt={i % 2 === 0 ? "tilt-l" : "tilt-r"}
                    color={i % 3 === 0 ? "alt" : "default"}
                    dataTestId={`search-video-${it.id}`}
                  >
                    <div className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">{it.date}</div>
                    <div className="font-marker text-lg text-[var(--ink-color)] leading-tight">"{it.title}"</div>
                    {it.thumbnail_path && (
                      <div className="mt-2 aspect-video bg-[var(--bg-color)] border-2 border-[var(--ink-color)] overflow-hidden">
                        <ProtectedImage src={it.thumbnail_path} alt={it.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(it.tags || []).slice(0, 4).map((t) => (
                        <span key={t} className="font-pixel text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">#{t}</span>
                      ))}
                    </div>
                  </StickyNote>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return <NotebookFrame leftPage={leftPage} rightPage={rightPage} />;
};

export default SearchResults;
