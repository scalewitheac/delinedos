import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { resolveMediaUrl } from "../ProtectedImage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
// No third-party fallback: the bookmark comes from site settings, and if it
// has not been set the ribbon simply renders without an image.
const FALLBACK_BOOKMARK = "";

export const RibbonBookmark = () => {
  const location = useLocation();
  const [logo, setLogo] = useState(FALLBACK_BOOKMARK);

  useEffect(() => {
    let alive = true;
    axios.get(`${API}/settings/images`).then((r) => {
      if (alive && r.data?.about_bookmark_path) setLogo(r.data.about_bookmark_path);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (location.pathname === "/" || location.pathname === "/disclaimer" || location.pathname === "/home") return null;
  return (
    <Link to="/about" className="ribbon" data-testid="ribbon-bookmark-link" aria-label="About">
      <span className="ribbon-label">about</span>
      <img
        src={resolveMediaUrl(logo)}
        alt=""
        aria-hidden="true"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="ribbon-mascot"
        data-testid="ribbon-mascot-img"
      />
    </Link>
  );
};

export const NotebookFrame = ({ children, leftPage, rightPage, single = false }) => {
  // Sub-pages render inside a full-screen CRT monitor with the notebook on the screen.
  return (
    <div className="crt-stage" data-testid="page-crt-stage">
      <div className="crt-monitor">
        <div className="crt-monitor-statusbar">
          <span><span className="led" /> delined</span>
          <PageOperatorBadge />
        </div>
        <div className="crt-monitor-glass">
          <div className="w-full h-full overflow-auto notebook-scroll">
            <div className="mx-auto max-w-6xl px-4 py-6">
              <div
                className={`grid ${single ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} bg-[var(--bg-color)] relative`}
                style={{ minHeight: "78vh", boxShadow: "0 30px 60px -20px var(--shadow), 0 0 0 1px rgba(0,0,0,0.06)" }}
              >
                {single ? (
                  <div className="paper paper-margin relative overflow-hidden">
                    <div className="relative z-10 p-8 md:p-12 min-h-[78vh]">{children}</div>
                  </div>
                ) : (
                  <>
                    <div className="paper paper-margin relative overflow-hidden">
                      <div className="relative z-10 p-6 md:p-10 min-h-[78vh]">{leftPage}</div>
                    </div>
                    <div className="paper relative overflow-hidden">
                      <div className="relative z-10 p-6 md:p-10 min-h-[78vh]">{rightPage}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small admin/visitor indicator shown in the CRT monitor statusbar
const PageOperatorBadge = () => {
  const { admin } = useAuth();
  return admin ? (
    <span data-testid="page-operator-badge" style={{ color: "#9aff9a" }}>
      ◆ operator online
    </span>
  ) : (
    <span style={{ color: "rgba(247, 214, 120, 0.75)" }}>◇ drifter mode</span>
  );
};

export const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();

  if (location.pathname === "/" || location.pathname === "/disclaimer" || location.pathname === "/home") return null;

  const items = [
    { to: "/home", label: "home" },
    { to: "/drawings", label: "doodles" },
    { to: "/writings", label: "writings" },
    { to: "/videos", label: "videos" },
    { to: "/contact", label: "contact" },
  ];

  return (
    <div className="w-full px-4 pt-6">
      <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-3">
        {items.map((it, idx) => (
          <Link
            key={it.to}
            to={it.to}
            data-testid={`nav-${it.label}-link`}
            className={`pico-btn ${idx % 2 === 0 ? "tilt-l" : "tilt-r"}`}
          >
            {it.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {admin ? (
            <>
              <Link to="/admin" className="pico-btn tilt-r" data-testid="nav-admin-link">admin</Link>
              <button onClick={() => { logout(); navigate("/home"); }} className="pico-btn" data-testid="nav-logout-btn">
                logout
              </button>
            </>
          ) : (
            <Link to="/admin/login" className="pico-btn tilt-l" data-testid="nav-admin-login-link">admin</Link>
          )}
        </div>
      </div>
    </div>
  );
};

export const PageCorner = ({ onClick, label = "next" }) => (
  <div
    className="page-corner"
    onClick={onClick}
    role="button"
    data-testid="page-corner-btn"
    title={label}
    aria-label={label}
  />
);

export const StickyNote = ({ children, color = "default", tilt = "tilt-l", onClick, dataTestId, withTape = true }) => (
  <div
    className={`sticky ${color === "alt" ? "sticky-alt" : ""} ${tilt} cursor-pointer select-none`}
    onClick={onClick}
    data-testid={dataTestId}
  >
    {withTape && <span className="tape" />}
    {children}
  </div>
);

export const PicoWindow = ({ title, children, footer }) => (
  <div className="pico-window">
    <div className="pico-titlebar">
      <span>{title}</span>
      <span>♥</span>
    </div>
    <div className="p-4">{children}</div>
    {footer && <div className="border-t-2 border-[var(--ink-color)] p-2 bg-[var(--bg-deep)]">{footer}</div>}
  </div>
);
