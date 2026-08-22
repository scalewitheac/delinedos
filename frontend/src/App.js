import React, { useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import "./App.css";

import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

import PasswordGate from "./pages/PasswordGate";
import Disclaimer from "./pages/Disclaimer";
import Hub from "./pages/Hub";
import Drawings from "./pages/Drawings";
import Writings from "./pages/Writings";
import Videos from "./pages/Videos";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import SearchResults from "./pages/SearchResults";

import { RibbonBookmark } from "./components/notebook/NotebookShell";
import BackButton from "./components/BackButton";
import SignOutButton from "./components/SignOutButton";

const RequireSiteAccess = ({ children, needDisclaimer = true }) => {
  const { siteUnlocked, disclaimerAccepted } = useAuth();
  const location = useLocation();
  if (!siteUnlocked) return <Navigate to="/" replace state={{ from: location }} />;
  if (needDisclaimer && !disclaimerAccepted) return <Navigate to="/disclaimer" replace />;
  return children;
};

const Layout = () => {
  // disable global right-click for art protection
  useEffect(() => {
    const onCtx = (e) => {
      const t = e.target;
      if (t && (t.tagName === "IMG" || t.tagName === "VIDEO")) e.preventDefault();
    };
    document.addEventListener("contextmenu", onCtx);
    return () => document.removeEventListener("contextmenu", onCtx);
  }, []);

  const { siteUnlocked, disclaimerAccepted } = useAuth();
  const { pathname } = useLocation();
  const onAuthScreens = pathname === "/" || pathname === "/disclaimer";
  const onHub = pathname === "/home";
  const showSignOut = siteUnlocked && disclaimerAccepted && !onAuthScreens && !onHub;

  return (
    <>
      <RibbonBookmark />
      <BackButton />
      {showSignOut && <SignOutButton variant="pill" />}
    </>
  );
};

function AppShell() {
  const toastOptions = useMemo(() => ({ className: "font-hand" }), []);
  return (
    <BrowserRouter>
      <Layout />
      <Routes>
        <Route path="/" element={<PasswordGate />} />
        <Route path="/disclaimer" element={
          <RequireSiteAccess needDisclaimer={false}><Disclaimer /></RequireSiteAccess>
        } />
        <Route path="/home" element={<RequireSiteAccess><Hub /></RequireSiteAccess>} />
        <Route path="/drawings" element={<RequireSiteAccess><Drawings /></RequireSiteAccess>} />
        <Route path="/writings" element={<RequireSiteAccess><Writings /></RequireSiteAccess>} />
        <Route path="/videos" element={<RequireSiteAccess><Videos /></RequireSiteAccess>} />
        <Route path="/about" element={<RequireSiteAccess><About /></RequireSiteAccess>} />
        <Route path="/contact" element={<RequireSiteAccess><Contact /></RequireSiteAccess>} />
        <Route path="/search" element={<RequireSiteAccess><SearchResults /></RequireSiteAccess>} />
        <Route path="/admin/login" element={<RequireSiteAccess><AdminLogin /></RequireSiteAccess>} />
        <Route path="/admin" element={<RequireSiteAccess><AdminPanel /></RequireSiteAccess>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="bottom-center" toastOptions={toastOptions} />
    </BrowserRouter>
  );
}

function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
