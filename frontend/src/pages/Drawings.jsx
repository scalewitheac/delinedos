import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { NotebookFrame, PageCorner, StickyNote } from "../components/notebook/NotebookShell";
import ProtectedImage from "../components/ProtectedImage";
import AdminQuickAdd from "../components/AdminQuickAdd";
import EditContentDialog from "../components/EditContentDialog";
import { useAuth } from "../context/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Drawings = () => {
  const { admin } = useAuth();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

const load = () =>
  axios
    .get(`${API}/drawings`)
    .then((r) => {
      setItems(Array.isArray(r.data) ? r.data : []);

      const preselectId = location.state?.selectedId;
      const picked = Array.isArray(r.data)
        ? r.data.find((x) => x.id === preselectId)
        : null;

      if (picked) {
        setSelected(picked);
      }
    })
    .catch(() => setItems([]))
    .finally(() => setLoading(false));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    // Tags can be entered as #tag (space- or comma-separated) or as title/date substrings
    const tagTokens = q.split(/[\s,]+/).filter((t) => t.startsWith("#")).map((t) => t.slice(1));
    return items.filter((it) => {
      const inTitle = it.title?.toLowerCase().includes(q);
      const inDate = it.date?.toLowerCase().includes(q);
      const inTags = tagTokens.length
        ? tagTokens.every((t) => (it.tags || []).map((x) => x.toLowerCase()).includes(t))
        : (it.tags || []).some((x) => x.toLowerCase().includes(q));
      return inTitle || inDate || inTags;
    });
  }, [items, query]);

  const next = () => {
    if (!selected || !filtered.length) return;
    const i = filtered.findIndex((x) => x.id === selected.id);
    setSelected(filtered[(i + 1) % filtered.length]);
  };

  const leftPage = (
    <div className="relative h-full">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-3 tilt-l2">doodles</h2>
      {selected ? (
        <div className="relative mt-2">
          <div className="relative bg-[var(--bg-color)] p-3 inline-block max-w-full tilt-l shadow-lg" style={{ boxShadow: "3px 6px 12px var(--shadow)" }}>
            <span className="tape tape-tl" />
            <span className="tape tape-tr" />
            <ProtectedImage
              src={selected.image_path}
              alt={selected.title}
              className="max-h-[55vh] w-auto object-contain block"
            />
          </div>
          <div className="mt-5 sticky tilt-r2 inline-block max-w-full p-3">
            <span className="tape" />
            <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">{selected.date}</div>
            <div className="font-marker text-2xl text-[var(--ink-color)] leading-tight">"{selected.title}"</div>
            {selected.description && (
              <p className="font-hand text-[var(--ink-soft)] mt-1 text-sm">{selected.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(selected.tags || []).map((t) => (
                <span key={t} className="font-pixel text-xs uppercase tracking-widest text-[var(--ink-color)]">#{t}</span>
              ))}
              {admin && (
                <button
                  type="button"
                  className="pico-btn ml-auto"
                  onClick={() => setEditing(selected)}
                  data-testid={`inline-edit-drawing-${selected.id}`}
                >
                  ✎ edit
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="font-hand text-[var(--ink-soft)]">
          {loading
            ? "loading..."
            : items.length
            ? "pick one from the index to view it."
            : "no drawings yet."}
        </p>
      )}
    </div>
  );

  const rightPage = (
    <div className="relative h-full">
      <AdminQuickAdd type="drawing" onAdded={load} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-marker text-3xl text-[var(--ink-color)] tilt-r">index</h3>
        <span className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
          {filtered.length} entries
        </span>
      </div>
      <div className="mb-4">
        <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)] block mb-1">
          search · title · date · #tag
        </label>
        <input
          className="pico-input font-hand"
          placeholder="e.g. #sketch  or  02/14/2026  or  rabbit"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="drawings-search-input"
        />
      </div>

      <div className="notebook-scroll overflow-y-auto pr-2" style={{ maxHeight: "60vh" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filtered.map((it, idx) => (
            <StickyNote
              key={it.id}
              tilt={idx % 2 === 0 ? "tilt-l" : "tilt-r"}
              color={idx % 3 === 0 ? "alt" : "default"}
              onClick={() => setSelected(it)}
              dataTestId={`drawing-thumb-${it.id}`}
            >
              <div className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">{it.date}</div>
              <div className="font-marker text-xl text-[var(--ink-color)] leading-tight">"{it.title}"</div>
              <div className="mt-2 aspect-[4/3] bg-[var(--bg-color)] border-2 border-[var(--ink-color)] overflow-hidden">
                <ProtectedImage src={it.image_path} alt={it.title} className="w-full h-full object-cover" />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(it.tags || []).slice(0, 3).map((t) => (
                  <span key={t} className="font-pixel text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">
                    #{t}
                  </span>
                ))}
              </div>
            </StickyNote>
          ))}
        </div>
        {!filtered.length && (
          <p className="font-hand text-[var(--ink-soft)] mt-6">
            {loading
              ? "loading..."
              : query.trim()
              ? "nothing here. try clearing the search."
              : "no drawings yet."}
          </p>
        )}
      </div>
      <PageCorner onClick={next} label="next entry" />
    </div>
  );

  return (
    <>
      <NotebookFrame leftPage={leftPage} rightPage={rightPage} />
      {editing && (
        <EditContentDialog
          type="drawing"
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => { setEditing(null); setSelected(updated); load(); }}
        />
      )}
    </>
  );
};

export default Drawings;
