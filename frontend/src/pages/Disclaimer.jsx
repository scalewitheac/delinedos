import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resolveMediaUrl } from "../components/ProtectedImage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
// No third-party fallback: the button image comes from site settings; without
// one the disclaimer falls back to its plain text button.
const FALLBACK_BTN = "";

const DEFAULT_TEXT = {
  heading: "Disclaimer",
  body_paragraphs: [
    "That this site is simply meant to be a personal creative art/writing/media sandbox and overall gallery for its owner.",
    "Consider it another random personal blog on this World Wide Web — with its true meanings and worth being defined only by the one who owns it and likewise decided to share it.",
    "As such — the content within can and WILL change based on the owner's collective whims and focus regarding their interests. Life changes — so does a persons attention and focus on occasion. Whatever you see here isn't meant to be restricted by your own views and interpretations. Or anyone else's.",
    "So while the owner cannot physically stop you from viewing this blog, nor can they force how you think or tell you what to do after you browse the contents within — try to remember that this blog may hold things not suitable for you…or an audience that is younger or more sensitive.",
  ],
  aka_line: "a.k.a…",
  warning_lines: [
    "Warning: This blog is 18+. Viewer Discretion is Advised",
    "This blog, isn't a babysitter.",
  ],
  ps_note: "P.S. — If and when you see any spelling or grammar errors, pretend this is an actual notebook. And remember human error is a thing that applies here. Along with sleep deprivation. Thanks.",
};

const Disclaimer = () => {
  const navigate = useNavigate();
  const { acceptDisclaimer } = useAuth();
  const [btnImg, setBtnImg] = useState(FALLBACK_BTN);
  const [text, setText] = useState(DEFAULT_TEXT);

  useEffect(() => {
    let alive = true;
    Promise.all([
      axios.get(`${API}/settings/images`).catch(() => null),
      axios.get(`${API}/settings/texts`).catch(() => null),
    ]).then(([imgRes, txtRes]) => {
      if (!alive) return;
      if (imgRes?.data?.disclaimer_button_path) setBtnImg(imgRes.data.disclaimer_button_path);
      if (txtRes?.data?.disclaimer) setText({ ...DEFAULT_TEXT, ...txtRes.data.disclaimer });
    });
    return () => { alive = false; };
  }, []);

  const handleEnter = () => {
    acceptDisclaimer();
    navigate("/home");
  };

  return (
    <div className="min-h-screen w-full py-12 px-4 relative" style={{ background: "var(--bg-deep)" }}>
      <div className="mx-auto max-w-3xl bg-[var(--bg-color)] paper paper-margin relative overflow-hidden shadow-2xl">
        <div className="relative z-10 p-8 md:p-14">
          <h1 className="font-marker text-6xl md:text-7xl text-[var(--ink-color)] leading-none mb-8 italic">
            {text.heading}
          </h1>

          <div className="space-y-4 font-hand text-lg md:text-xl text-[var(--ink-color)] leading-relaxed">
            {(text.body_paragraphs || []).map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
            {text.aka_line ? (
              <p className="italic">{text.aka_line}</p>
            ) : null}
            {(text.warning_lines || []).map((w, i) => (
              <p key={`w-${i}`} className="font-bold text-center">{w}</p>
            ))}
            {text.ps_note ? (
              <p className="italic text-[var(--ink-soft)] text-base md:text-lg mt-6 whitespace-pre-line">
                {text.ps_note}
              </p>
            ) : null}
          </div>

          <div className="mt-16 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleEnter}
              data-testid="disclaimer-accept-btn"
              aria-label="I Understand — enter the menu"
              className="block hover:scale-[1.03] active:scale-95 transition-transform duration-150"
            >
              <img
                src={resolveMediaUrl(btnImg)}
                alt="I Understand — enter the menu"
                style={{ height: "auto", width: "auto", maxWidth: "min(420px, 90%)", display: "block" }}
                className="select-none mx-auto"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                data-testid="disclaimer-souvenir-img"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
