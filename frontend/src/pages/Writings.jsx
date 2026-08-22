import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { NotebookFrame, PageCorner, StickyNote } from "../components/notebook/NotebookShell";
import AdminQuickAdd from "../components/AdminQuickAdd";
import EditContentDialog from "../components/EditContentDialog";
import { useAuth } from "../context/AuthContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Writings = () => {
  const { admin } = useAuth();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

  const load = () =>
  axios.get(`${API}/writings`).then((r) => {
    const data = Array.isArray(r.data)
      ? r.data
      : r.data.writings || [];

    setItems(data);
  });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const inTitle = it.title?.toLowerCase().includes(q);
      const inDate = it.date?.toLowerCase().includes(q);
      const inTags = (it.tags || []).some((t) => t.toLowerCase().includes(q.replace(/^#/, "")));
      const inContent = it.content?.toLowerCase().includes(q);
      return inTitle || inDate || inTags || inContent;
    });
  }, [items, query]);

  const next = () => {
    if (!selected || !filtered.length) return;
    const i = filtered.findIndex((x) => x.id === selected.id);
    setSelected(filtered[(i + 1) % filtered.length]);
  };

  const leftPage = (
    <div className="relative h-full">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-2 tilt-l2">writings</h2>
      {selected ? (
        <article className="mt-4">
          <div className="sticky tilt-l inline-block p-3 mb-5">
            <span className="tape tape-tl" />
            <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">{selected.date}</div>
            <div className="font-marker text-3xl text-[var(--ink-color)] leading-tight">"{selected.title}"</div>
            {admin && (
              <button
                type="button"
                className="pico-btn mt-2"
                onClick={() => setEditing(selected)}
                data-testid={`inline-edit-writing-${selected.id}`}
              >
                ✎ edit
              </button>
            )}
          </div>
          <div className="font-hand text-lg md:text-xl text-[var(--ink-color)] leading-loose whitespace-pre-wrap">
            {selected.content}
          </div>
        </article>
      ) : (
        <p className="font-hand text-[var(--ink-soft)]">no writings yet.</p>
      )}
    </div>
  );

  const rightPage = (
    <div className="relative h-full">
      <AdminQuickAdd type="writing" onAdded={load} />
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-marker text-3xl text-[var(--ink-color)] tilt-r">index</h3>
        <span className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">{filtered.length}</span>
      </div>
      <input
        className="pico-input font-hand mb-4"
        placeholder="search title · date · #tag · text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-testid="writings-search-input"
      />
      <div className="notebook-scroll overflow-y-auto pr-2 space-y-4" style={{ maxHeight: "60vh" }}>
        {filtered.map((it, idx) => (
          <StickyNote
            key={it.id}
            tilt={idx % 2 === 0 ? "tilt-l" : "tilt-r"}
            color={idx % 2 === 0 ? "default" : "alt"}
            onClick={() => setSelected(it)}
            dataTestId={`writing-thumb-${it.id}`}
          >
            <div className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">{it.date}</div>
            <div className="font-marker text-xl text-[var(--ink-color)] leading-tight">"{it.title}"</div>
            <p className="font-hand text-[var(--ink-soft)] text-sm mt-1 line-clamp-2">{it.content?.slice(0, 120)}…</p>
          </StickyNote>
        ))}
        {!filtered.length && <p className="font-hand text-[var(--ink-soft)]">nothing here.</p>}
      </div>
      <PageCorner onClick={next} label="next entry" />
    </div>
  );

  return (
    <>
      <NotebookFrame leftPage={leftPage} rightPage={rightPage} />
      {editing && (
        <EditContentDialog
          type="writing"
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => { setEditing(null); setSelected(updated); load(); }}
        />
      )}
    </>
  );
};

export default Writings;
