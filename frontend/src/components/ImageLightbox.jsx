import React, { useEffect, useCallback } from "react";
import ProtectedImage from "./ProtectedImage";

/**
 * Full-size image viewer, styled to match the video lightbox.
 *
 * Keeps the same protections as ProtectedImage elsewhere on the site (no
 * dragging, no context menu) so opening an image larger does not quietly make
 * it easier to lift.
 *
 * @param item     the drawing being shown ({ image_path, title, date, description, tags })
 * @param onClose  called on the X, a backdrop click, or Escape
 * @param onPrev   optional — omit to hide the back control
 * @param onNext   optional — omit to hide the forward control
 * @param position optional "2 / 7" style counter
 */
const ImageLightbox = ({ item, onClose, onPrev, onNext, position }) => {
  const handleKey = useCallback(
    (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose?.(); }
      else if (e.key === "ArrowLeft" && onPrev) { e.preventDefault(); onPrev(); }
      else if (e.key === "ArrowRight" && onNext) { e.preventDefault(); onNext(); }
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    // Stop the page behind the overlay from scrolling while it is open, and
    // restore whatever the page had set before (not a hardcoded value).
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [handleKey]);

  if (!item) return null;

  return (
    <div
      className="lightbox-bg"
      data-testid="image-lightbox"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={item.title || "image"}
    >
      <div
        className="pico-window w-full max-w-5xl max-h-full flex flex-col overflow-y-auto"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="pico-titlebar">
          <span>{item.title}</span>
          <button className="font-pixel" onClick={onClose} data-testid="image-close-btn" aria-label="close">
            [X]
          </button>
        </div>

        <div className="p-3 bg-[var(--bg-color)] flex items-center justify-center overflow-auto">
          <ProtectedImage
            src={item.image_path}
            alt={item.title}
            className={`max-w-full ${item.description ? "max-h-[58vh]" : "max-h-[75vh]"} w-auto h-auto object-contain`}
          />
        </div>

        {item.description && (
          // Matches how the video player presents its description: pre-wrap so
          // typed line breaks survive, height-capped so a long note scrolls
          // rather than pushing the controls off screen.
          <div className="px-3 pb-3 bg-[var(--bg-color)]" data-testid="image-description-panel">
            <p
              className="font-hand text-[var(--ink-color)] text-base md:text-lg leading-relaxed whitespace-pre-wrap max-h-[22vh] overflow-y-auto notebook-scroll"
              data-testid="image-description"
            >
              {item.description}
            </p>
          </div>
        )}

        <div className="border-t-2 border-[var(--ink-color)] bg-[var(--bg-deep)] p-2 flex flex-wrap gap-2 items-center">
          <span className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)]">
            {item.date}
          </span>
          {(item.tags || []).slice(0, 4).map((t) => (
            <span key={t} className="font-pixel text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">
              #{t}
            </span>
          ))}
          {position && (
            <span className="font-pixel uppercase text-[10px] tracking-widest text-[var(--ink-soft)] ml-auto">
              {position}
            </span>
          )}
          <div className={`flex gap-2 ${position ? "" : "ml-auto"}`}>
            {onPrev && (
              <button className="pico-btn" onClick={onPrev} data-testid="image-prev-btn">◀ prev</button>
            )}
            {onNext && (
              <button className="pico-btn" onClick={onNext} data-testid="image-next-btn">next ▶</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;
