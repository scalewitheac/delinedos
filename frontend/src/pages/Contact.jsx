import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { NotebookFrame, StickyNote } from "../components/notebook/NotebookShell";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_RANDOM_QUESTIONS = [
  "If you were a sticky note, what color would you be and what would you say?",
  "What's the weirdest dream you remember and never told anyone about?",
  "If your handwriting had a personality, how would you describe it?",
  "What's a song you'd play on loop while doodling at 3am?",
  "If this blog were a room, what one object would you leave in it?",
  "What's an opinion you hold that you secretly think no one else does?",
  "Describe yourself using only three random objects from your desk.",
  "What's the last small thing that made you genuinely smile?",
  "If you could leave one footnote in someone else's diary, what would it say?",
  "What's the smell of your favorite memory?",
  "If your week had a soundtrack title, what would it be?",
  "What's a secret hobby you'd start if no one was watching?",
];

const Contact = () => {
  const [messages, setMessages] = useState([]);
  const [questionPool, setQuestionPool] = useState(DEFAULT_RANDOM_QUESTIONS);
  const randomQuestion = useMemo(
    () => questionPool[Math.floor(Math.random() * questionPool.length)],
    [questionPool]
  );
  const [form, setForm] = useState({
    name: "",
    email: "",
    website: "",
    found_via: "",
    sender_descriptor: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

 const loadMessages = () =>
  axios.get(`${API}/messages`).then((r) => {
    const data = Array.isArray(r.data)
      ? r.data
      : r.data.messages || [];

    setMessages(data);
  });

  useEffect(() => {
    loadMessages();
    axios.get(`${API}/settings/texts`).then((r) => {
      const pool = r.data?.contact?.random_questions;
      if (Array.isArray(pool) && pool.length > 0) setQuestionPool(pool);
    }).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast("please fill name, email, and message.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/messages`, form);
      toast("note slipped under the door. it will appear once approved.");
      setForm({ name: "", email: "", website: "", found_via: "", sender_descriptor: "", message: "" });
    } catch (err) {
      toast("could not send. try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const leftPage = (
    <div className="relative h-full">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-2 tilt-l2">message board</h2>
      <p className="font-hand text-[var(--ink-soft)] mb-5">
        notes that have been read and pinned. ✎
      </p>
      <div className="notebook-scroll overflow-y-auto pr-2 space-y-4" style={{ maxHeight: "65vh" }}>
        {messages.length === 0 && (
          <p className="font-hand text-[var(--ink-soft)]">no notes pinned yet.</p>
        )}
        {messages.map((m, idx) => (
          <StickyNote
            key={m.id}
            tilt={idx % 2 === 0 ? "tilt-l" : "tilt-r"}
            color={idx % 3 === 0 ? "alt" : "default"}
            withTape
            dataTestId={`message-${m.id}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-marker text-xl text-[var(--ink-color)]">{m.name}</span>
              <span className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">
                {new Date(m.created_at).toLocaleDateString()}
              </span>
            </div>
            {m.sender_descriptor && (
              <div className="font-hand italic text-[var(--ink-soft)] text-xs mb-1">
                a map to: {m.sender_descriptor}
              </div>
            )}
            <p className="font-hand text-[var(--ink-color)] text-base whitespace-pre-wrap">{m.message}</p>
          </StickyNote>
        ))}
      </div>
    </div>
  );

  const rightPage = (
    <div className="relative h-full">
      <h3 className="font-marker text-3xl text-[var(--ink-color)] tilt-r mb-2">slip a note</h3>
      <p className="font-hand text-[var(--ink-soft)] mb-4 text-sm">
        all messages are read before being pinned.
      </p>
      <form onSubmit={submit} className="space-y-3" data-testid="contact-form">
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">name *</label>
          <input
            className="pico-input font-hand"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            data-testid="contact-name-input"
          />
        </div>
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">email *</label>
          <input
            type="email"
            className="pico-input font-hand"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            data-testid="contact-email-input"
          />
        </div>
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">website / socials</label>
          <input
            className="pico-input font-hand"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            data-testid="contact-website-input"
          />
        </div>
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
            how did you come across this site?
          </label>
          <input
            className="pico-input font-hand"
            value={form.found_via}
            onChange={(e) => setForm({ ...form, found_via: e.target.value })}
            data-testid="contact-found-input"
          />
        </div>
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">
            a random question
          </label>
          <div
            className="font-hand italic text-[var(--ink-soft)] text-sm mb-1"
            data-testid="contact-random-question"
          >
            "{randomQuestion}"
          </div>
          <input
            className="pico-input font-hand"
            placeholder="…?"
            value={form.sender_descriptor}
            onChange={(e) => setForm({ ...form, sender_descriptor: e.target.value })}
            data-testid="contact-descriptor-input"
          />
        </div>
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">message *</label>
          <textarea
            className="pico-input font-hand min-h-[120px]"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            data-testid="contact-message-input"
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting} className="pico-btn tilt-l" data-testid="contact-submit-btn">
            {submitting ? "..." : "Slip Onto The Desk"}
          </button>
        </div>
      </form>
    </div>
  );

  return <NotebookFrame leftPage={leftPage} rightPage={rightPage} />;
};

export default Contact;
