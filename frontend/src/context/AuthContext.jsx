import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // site password gate
  const [siteUnlocked, setSiteUnlocked] = useState(() => sessionStorage.getItem("site-unlocked") === "1");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => sessionStorage.getItem("disclaimer-accepted") === "1");

  // admin auth
  const [token, setToken] = useState(() => localStorage.getItem("admin-token") || null);
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    if (!token) { setAdmin(null); return; }
    axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setAdmin(r.data))
      .catch(() => { setToken(null); localStorage.removeItem("admin-token"); });
  }, [token]);

  const verifySitePassword = async (password) => {
    const { data } = await axios.post(`${API}/site/verify-password`, { password });
    sessionStorage.setItem("site-unlocked", "1");
    setSiteUnlocked(true);
    // If the password matched the admin's, the backend issues a JWT in the
    // same call — store it so the user enters as the operator without a
    // second login step.
    if (data && data.token) {
      localStorage.setItem("admin-token", data.token);
      setToken(data.token);
      if (data.user) setAdmin(data.user);
    }
    return data;
  };

  const acceptDisclaimer = () => {
    sessionStorage.setItem("disclaimer-accepted", "1");
    setDisclaimerAccepted(true);
  };

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("admin-token", data.token);
    setToken(data.token);
    setAdmin(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("admin-token");
    setToken(null);
    setAdmin(null);
  };

  // Full sign-out: clears the site password gate, disclaimer flag, and
  // any admin session. Sends user back to the boot/password screen.
  const signOut = () => {
    localStorage.removeItem("admin-token");
    sessionStorage.removeItem("site-unlocked");
    sessionStorage.removeItem("disclaimer-accepted");
    setToken(null);
    setAdmin(null);
    setSiteUnlocked(false);
    setDisclaimerAccepted(false);
  };

  return (
    <AuthContext.Provider value={useMemo(() => ({
      siteUnlocked, verifySitePassword,
      disclaimerAccepted, acceptDisclaimer,
      token, admin, login, logout, signOut, API,
    }), [siteUnlocked, disclaimerAccepted, token, admin])}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
