import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotebookFrame } from "../components/notebook/NotebookShell";

const AdminLogin = () => {
  const { login, token } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Already signed in — go straight to the panel instead of asking again.
  // The token is restored from localStorage on load, so this also covers
  // returning to the site in a new tab or after a refresh.
  if (token) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "could not log in.");
    }
  };

  const page = (
    <div className="max-w-md mx-auto">
      <h2 className="font-marker text-4xl text-[var(--ink-color)] mb-2 tilt-l2">admin login</h2>
      <p className="font-hand text-[var(--ink-soft)] mb-6">private — for the owner.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">email</label>
          <input
            className="pico-input font-hand"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="admin-login-email-input"
          />
        </div>
        <div>
          <label className="font-pixel uppercase text-xs tracking-widest text-[var(--ink-soft)]">password</label>
          <input
            type="password"
            className="pico-input font-hand"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="admin-login-password-input"
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="pico-btn" data-testid="admin-login-submit-btn">log in</button>
          {error && <span className="font-hand text-[var(--margin-color)]" data-testid="admin-login-error">{error}</span>}
        </div>
      </form>
    </div>
  );

  return <NotebookFrame single>{page}</NotebookFrame>;
};

export default AdminLogin;
