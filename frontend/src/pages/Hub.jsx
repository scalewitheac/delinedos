import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SignOutButton from "../components/SignOutButton";
import { resolveMediaUrl } from "../components/ProtectedImage";
import * as sfx from "../lib/sfx";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MENU = [
  { to: "/drawings", label: "Drawings", sub: "doodles & multimedia" },
  { to: "/writings", label: "Writings", sub: "musings & notices" },
  { to: "/videos",   label: "Videos",   sub: "shorts & timelapses" },
  { to: "/contact",  label: "Multiplayer",  sub: "leave a transmission" },
];

const SHELL_COLORS = [
  { id: "mauve",     name: "mauve" },
  { id: "magenta",   name: "magenta" },
  { id: "cyan",      name: "cyan" },
  { id: "turquoise", name: "turquoise" },
  { id: "navy",      name: "navy" },
  { id: "olive",     name: "olive" },
];

const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const Hub = () => {
  const navigate = useNavigate();
  const clock = useClock();
  const { admin, token } = useAuth();
  const [cursor, setCursor] = useState(0);
  const [booting, setBooting] = useState(true);
  const [shell, setShell] = useState(() => localStorage.getItem("device-shell") || "mauve");
  const [muted, setMutedState] = useState(() => localStorage.getItem("device-muted") === "1");
  const [bgImage, setBgImage] = useState("");
  const [hubQuery, setHubQuery] = useState("");

  useEffect(() => {
    let alive = true;
    axios.get(`${API}/settings/images`).then((r) => {
      if (alive && r.data?.hub_background_path) setBgImage(r.data.hub_background_path);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => { localStorage.setItem("device-shell", shell); }, [shell]);
  useEffect(() => {
    sfx.setMuted(muted);
    localStorage.setItem("device-muted", muted ? "1" : "0");
  }, [muted]);

  useEffect(() => {
    const t1 = setTimeout(() => { sfx.unlockAudio(); sfx.boot(); }, 320);
    const t2 = setTimeout(() => setBooting(false), 750);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const onFirst = () => { sfx.unlockAudio(); };
    window.addEventListener("pointerdown", onFirst, { once: true });
    window.addEventListener("keydown", onFirst, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
  }, []);

  const moveCursor = (delta) => {
    setCursor((c) => {
      sfx.blip();
      return (c + delta + MENU.length) % MENU.length;
    });
  };
  const dpadUp    = () => moveCursor(-2);
  const dpadDown  = () => moveCursor(2);
  const dpadLeft  = () => moveCursor(-1);
  const dpadRight = () => moveCursor(1);
  const enter = () => { sfx.select(); navigate(MENU[cursor].to); };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowDown")  { e.preventDefault(); dpadDown(); }
      else if (e.key === "ArrowUp")    { e.preventDefault(); dpadUp(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); dpadRight(); }
      else if (e.key === "ArrowLeft")  { e.preventDefault(); dpadLeft(); }
      else if (e.key === "Enter")      { e.preventDefault(); enter(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [cursor]);

  return (
    <div
      className="retro-stage"
      data-testid="hub-device-stage"
      style={bgImage ? { backgroundImage: `url(${resolveMediaUrl(bgImage)})` } : undefined}
    >
      <div className="device" data-shell={shell} data-testid="device-shell" role="region" aria-label="delined handheld console" style={{ position: "relative", zIndex: 2 }}>
        {/* Header strip */}
        <div className="device-header">
          <span><span className="power-led" />power on</span>
          <button
            type="button"
            onClick={() => setMutedState((m) => !m)}
            style={{
              fontFamily: "'VT323', monospace",
              fontSize: "0.85rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              padding: "3px 10px",
              borderRadius: 999,
              background: "transparent",
              color: "inherit",
              border: "1px solid currentColor",
              cursor: "pointer",
            }}
            data-testid="device-sound-toggle"
            aria-label="toggle sound"
            title={muted ? "sound off" : "sound on"}
          >
            ♪ {muted ? "off" : "on"}
          </button>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>delined — v1.0</span>
            <SignOutButton variant="device" />
          </span>
        </div>

        {/* Screen */}
        <div className="screen-bezel">
          <div className="crt-screen" data-testid="crt-screen">
            <div className="crt-noise" />

            <div className="crt-statusbar">
              <span>
                {admin ? (
                  <span data-testid="operator-badge" style={{ color: "#9aff9a" }}>◉ operator</span>
                ) : (
                  <span>◉ drifter</span>
                )}
              </span>
              <span>{clock}</span>
            </div>

            <div className="crt-title">
              ▒ delined<span className="crt-blink">_</span>
            </div>

            {booting ? (
              <div style={{ position: "relative", zIndex: 4, textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: "1.1rem", letterSpacing: "0.18em" }}>booting…</div>
                <div style={{ marginTop: 14, color: "var(--crt-fg-dim)" }}>
                  loading channels ░░░░░░░░░░
                </div>
              </div>
            ) : (
              <>
                <div className="crt-grid">
                  {MENU.map((m, i) => (
                    <Link
                      key={m.to}
                      to={m.to}
                      data-testid={`hub-nav-${m.label.toLowerCase()}-link`}
                      className="crt-card"
                      onMouseEnter={() => { if (cursor !== i) sfx.blip(); setCursor(i); }}
                      onFocus={() => setCursor(i)}
                      onClick={() => sfx.select()}
                      style={cursor === i ? {
                        background: "rgba(247, 214, 120, 0.14)",
                        boxShadow: "0 0 0 1px var(--crt-fg) inset, 0 0 16px var(--crt-glow)",
                    } : undefined}
                  >
                    <div className="label">
                      {cursor === i ? "▸ " : "  "}{m.label}
                    </div>
                    <div className="sub">{m.sub}</div>
                    <span className="arrow">▶</span>
                  </Link>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = (hubQuery || "").trim();
                    if (!q) return;
                    sfx.select();
                    navigate(`/search?q=${encodeURIComponent(q)}`);
                  }}
                  style={{ position: "relative", zIndex: 4, marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}
                >
                  <span style={{ fontFamily: "'VT323', monospace", color: "var(--crt-fg-dim)" }}>search ▸</span>
                  <input
                    value={hubQuery}
                    onChange={(e) => setHubQuery(e.target.value)}
                    placeholder="title · #tag · text"
                    data-testid="hub-search-input"
                    style={{
                      flex: 1,
                      background: "rgba(0,0,0,0.35)",
                      color: "var(--crt-fg)",
                      border: "1px solid var(--crt-fg-dim)",
                      padding: "5px 10px",
                      fontFamily: "'VT323', monospace",
                      fontSize: "1rem",
                      outline: "none",
                      borderRadius: 4,
                    }}
                  />
                  <button
                    type="submit"
                    data-testid="hub-search-submit"
                    style={{
                      background: "transparent",
                      color: "var(--crt-fg)",
                      border: "1px solid var(--crt-fg)",
                      padding: "4px 12px",
                      fontFamily: "'VT323', monospace",
                      cursor: "pointer",
                      borderRadius: 4,
                    }}
                  >
                    go
                  </button>
                </form>
              </>
            )}

            <div className="crt-footer">
              <span>↕ select</span>
              <span>↵ enter</span>
            </div>
          </div>
        </div>

        {/* Controls row — D-pad / Start-Select / A-B */}
        <div className="controls">
          <div className="dpad" aria-label="d-pad">
            <button type="button" className="up"    onClick={dpadUp}    data-testid="dpad-up"    aria-label="up">▲</button>
            <button type="button" className="down"  onClick={dpadDown}  data-testid="dpad-down"  aria-label="down">▼</button>
            <button type="button" className="left"  onClick={dpadLeft}  data-testid="dpad-left"  aria-label="left">◀</button>
            <button type="button" className="right" onClick={dpadRight} data-testid="dpad-right" aria-label="right">▶</button>
            <span className="center" aria-hidden="true" />
          </div>

          <div className="start-select">
            <Link to="/about" className="pill-btn" data-testid="device-select-btn" onClick={() => sfx.click()}>select • origin</Link>
            <button type="button" className="pill-btn" data-testid="device-start-btn" onClick={enter}>
              start ▸
            </button>
          </div>

          <div className="ab-buttons" aria-hidden="false">
            <Link to="/contact"     className="ab-button" data-testid="device-a-btn" title="multiplayer"    onClick={() => sfx.click()}>A</Link>
            <Link to={token ? "/admin" : "/admin/login"} className="ab-button" data-testid="device-b-btn" title={token ? "operator panel" : "operator"}    onClick={() => sfx.click()}>B</Link>
          </div>
        </div>

        {/* Color picker — its own row below controls */}
        <div className="color-strips-row">
          <span className="label">shell color</span>
          <div className="color-strips" role="radiogroup" aria-label="device color">
            {SHELL_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-pressed={shell === c.id}
                aria-label={c.name}
                title={c.name}
                className={`color-strip color-strip-${c.id}`}
                data-testid={`device-color-${c.id}`}
                onClick={() => { setShell(c.id); sfx.click(); }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hub;
