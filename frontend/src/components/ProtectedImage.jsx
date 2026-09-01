import React from "react";

// Resolves a stored image_path:
// - If it's an http(s) URL, return as-is.
// - Otherwise treat it as a storage_path served via /api/files/{path}.
/**
 * @param path stored storage_path, or an absolute URL
 * @param size "thumb" | "md" — request a smaller rendition. Omitted means the
 *   full original. The backend falls back to the original whenever the
 *   requested size does not exist, so this is always safe to ask for.
 */
export const resolveMediaUrl = (path, size) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = `${process.env.REACT_APP_BACKEND_URL}/api/files/${path}`;
  return size ? `${base}?size=${encodeURIComponent(size)}` : base;
};

const ProtectedImage = ({ src, alt = "", className = "", style, size, loading = "lazy" }) => {
  return (
    <img
      src={resolveMediaUrl(src, size)}
      alt={alt}
      className={className}
      style={style}
      // Off-screen grid images are not fetched until they scroll into view.
      loading={loading}
      decoding="async"
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        // prevent middle/right click triggers
        if (e.button === 2) e.preventDefault();
      }}
    />
  );
};

export default ProtectedImage;
