import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Site-wide deterrents against casually saving media.
 *
 * Deliberately honest about what this is: anything the browser renders has
 * already been downloaded to the viewer's machine, and screenshots, devtools
 * and the network tab all still work. This raises the effort of the easy
 * paths — right-click "Save image as", dragging an image to the desktop, and
 * long-press "Add to Photos" on mobile — it does not make content private.
 *
 * Applied at the document level rather than per-component so new pages and
 * images are covered automatically; previously each component had to remember
 * to opt in, and several did not.
 *
 * Signed-in admins are exempt, so managing your own files is not a fight.
 */
const ContentProtection = () => {
  const { admin } = useAuth();

  useEffect(() => {
    if (admin) {
      document.documentElement.classList.remove("protect-media");
      return undefined;
    }

    document.documentElement.classList.add("protect-media");

    const isMedia = (el) =>
      el && (el.tagName === "IMG" || el.tagName === "VIDEO" ||
        (typeof el.closest === "function" && el.closest("[data-protected]")));

    // Only suppress the menu over media. Blocking it page-wide breaks
    // spellcheck, copy and the browser's own accessibility affordances on
    // text, for no benefit.
    const onContextMenu = (e) => { if (isMedia(e.target)) e.preventDefault(); };
    const onDragStart = (e) => { if (isMedia(e.target)) e.preventDefault(); };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
      document.documentElement.classList.remove("protect-media");
    };
  }, [admin]);

  return null;
};

export default ContentProtection;
