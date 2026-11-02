import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { uploadLargeVideo } from "../utils/videoUpload";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/*
 * Small file-upload button used by the admin UI. Wraps POST /api/upload.
 * onUploaded is called with the returned storage_path so the parent can put
 * it into form state.
 */
const UploadField = ({ label, onUploaded, accept, testId }) => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem("delined-admin-token") || localStorage.getItem("admin-token");
    if (!token) { toast("not signed in"); return; }
    setBusy(true);
    try {
      const api = axios.create({
        baseURL: API,
        headers: { Authorization: `Bearer ${token}` },
      });
      let data;
      if (file.type.startsWith("video/")) {
        data = await uploadLargeVideo(file, api, setProgress);
      } else {
        const fd = new FormData();
        fd.append("file", file);
        ({ data } = await api.post("/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        }));
      }
      onUploaded(data.storage_path);
      toast(`uploaded ${file.name}`);
    } catch (err) {
      toast(err.response?.data?.detail || err.message || "upload failed.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <label className="pico-btn cursor-pointer inline-block" data-testid={testId}>
      {busy ? `uploading ${progress}%` : label}
      <input type="file" className="hidden" accept={accept} onChange={onPick} />
    </label>
  );
};

export default UploadField;
