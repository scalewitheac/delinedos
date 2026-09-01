import React, { useEffect, useState } from "react";
import axios from "axios";
import { NotebookFrame } from "../components/notebook/NotebookShell";
import ProtectedImage from "../components/ProtectedImage";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const FALLBACK_ARTIST_IMG =
  "https://images.pexels.com/photos/29861519/pexels-photo-29861519.jpeg?auto=compress&cs=tinysrgb&w=900";

const SOCIALS = ["instagram", "twitter", "tiktok", "youtube", "tumblr"];

const DEFAULT_TEXT = {
  section_label: "whoami",
  heading: "a strange diary keeper",
  bio_paragraphs: [
    "hi. i draw, write, and film small things. this site is a collected mess of those things — a sandbox more than a gallery.",
    "most entries are made in margins, on receipts, between classes, after sleep. i'd rather show the doodle than the polished version.",
    "if you'd like to leave a note, the contact page has a message board. messages are read before being shown.",
  ],
  signature: "— The author",
  socials_label: "other notebooks",
  content_warning_label: "content warning",
  content_warning_text:
    "Asking questions while someone is drawing may be distracting. Especially if the questions are consistent, repetitive, and are more critical than inquisitive.",
};

const About = () => {
  const [artistImg, setArtistImg] = useState(FALLBACK_ARTIST_IMG);
  const [text, setText] = useState(DEFAULT_TEXT);

  useEffect(() => {
    let alive = true;
    Promise.all([
      axios.get(`${API}/settings/about`).catch(() => null),
      axios.get(`${API}/settings/texts`).catch(() => null),
    ]).then(([imgRes, txtRes]) => {
      if (!alive) return;
      if (imgRes?.data?.artist_image_path) setArtistImg(imgRes.data.artist_image_path);
      if (txtRes?.data?.about) setText({ ...DEFAULT_TEXT, ...txtRes.data.about });
    });
    return () => { alive = false; };
  }, []);

  const leftPage = (
    <div className="relative h-full">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-3 tilt-l2">about</h2>
      <div className="relative bg-[var(--bg-color)] p-3 inline-block tilt-l shadow-lg" style={{ boxShadow: "3px 6px 14px var(--shadow)" }}>
        <span className="tape tape-tl" />
        <span className="tape tape-tr" />
        <ProtectedImage
          src={artistImg}
          size="md"
          loading="eager"
          alt="artist"
          className="w-72 h-80 object-cover"
        />
      </div>

      <div className="mt-6 sticky tilt-r2 inline-block p-3">
        <span className="tape" />
        <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
          {text.content_warning_label}
        </div>
        <p className="font-hand text-[var(--ink-color)] text-base mt-1 max-w-sm whitespace-pre-line">
          {text.content_warning_text}
        </p>
      </div>
    </div>
  );

  const rightPage = (
    <div className="relative h-full">
      <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
        {text.section_label}
      </div>
      <h3 className="font-marker text-4xl text-[var(--ink-color)] mb-4">{text.heading}</h3>

      <div className="font-hand text-lg text-[var(--ink-color)] leading-relaxed space-y-3">
        {(text.bio_paragraphs || []).map((p, i) => (
          <p key={i} className="whitespace-pre-line">{p}</p>
        ))}
        {text.signature ? (
          <p className="italic text-[var(--ink-soft)]">{text.signature}</p>
        ) : null}
      </div>

      <div className="mt-8">
        <div className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)] mb-2">
          {text.socials_label}
        </div>
        <div className="flex flex-wrap gap-3">
          {SOCIALS.map((label, idx) => (
            <span
              key={label}
              data-testid={`social-${label}-link`}
              className={`pico-btn ${idx % 2 === 0 ? "tilt-l" : "tilt-r"} pointer-events-none relative`}
              title="error"
            >
              <span className="relative">
                <span className="graphite-eraser absolute -inset-1 rounded-sm" aria-hidden />
                <span className="relative opacity-60">error</span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return <NotebookFrame leftPage={leftPage} rightPage={rightPage} />;
};

export default About;
