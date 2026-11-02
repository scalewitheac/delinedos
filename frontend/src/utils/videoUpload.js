import axios from "axios";

const MAX_VIDEO_BYTES = 5_000_000_000;

const putPartWithProgress = (url, blob, onProgress) => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open("PUT", url);
  xhr.setRequestHeader("Content-Type", "application/octet-stream");
  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) onProgress(event.loaded);
  };
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      const etag = xhr.getResponseHeader("ETag");
      if (!etag) return reject(new Error("R2 did not expose the ETag response header. Check bucket CORS settings."));
      resolve(etag);
    } else {
      reject(new Error(`Cloudflare R2 upload failed (HTTP ${xhr.status}).`));
    }
  };
  xhr.onerror = () => reject(new Error("Network error while uploading to Cloudflare R2."));
  xhr.onabort = () => reject(new Error("Upload was cancelled."));
  xhr.send(blob);
});

export const uploadLargeVideo = async (file, api, onProgress = () => {}) => {
  if (file.size > MAX_VIDEO_BYTES) throw new Error("Video exceeds the 5 GB maximum.");
  const { data: session } = await api.post("/upload/video/multipart/init", {
    filename: file.name,
    content_type: file.type || "video/mp4",
    size: file.size,
  });
  const completedParts = new Array(session.total_parts);
  const loadedByPart = new Array(session.total_parts).fill(0);
  let nextPart = 0;

  const worker = async () => {
    while (true) {
      const index = nextPart++;
      if (index >= session.total_parts) return;
      const partNumber = index + 1;
      const start = index * session.part_size;
      const blob = file.slice(start, Math.min(start + session.part_size, file.size));
      const { data: signed } = await api.post(
        `/upload/video/multipart/${session.upload_id}/part-url`,
        null,
        { params: { part_number: partNumber } }
      );
      const etag = await putPartWithProgress(signed.url, blob, (loaded) => {
        loadedByPart[index] = loaded;
        const loadedTotal = loadedByPart.reduce((sum, value) => sum + value, 0);
        onProgress(Math.min(99, Math.round((loadedTotal / file.size) * 100)));
      });
      completedParts[index] = { part_number: partNumber, etag };
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(3, session.total_parts) }, worker));
    const { data } = await api.post(
      `/upload/video/multipart/${session.upload_id}/complete`,
      { parts: completedParts }
    );
    onProgress(100);
    return data;
  } catch (error) {
    try {
      await api.post(`/upload/video/multipart/${session.upload_id}/abort`);
    } catch (_) { /* best-effort cleanup */ }
    throw error;
  }
};
