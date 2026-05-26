"use client";

import { useEffect } from "react";

/** Locks body scroll so the snap container is the only scroll surface.
 *  Only active at md+ — on mobile the snap layout is disabled and the
 *  page itself must scroll. */
export function SnapLock() {
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      document.body.style.overflow = mql.matches ? "hidden" : "";
    };
    apply();
    mql.addEventListener("change", apply);
    return () => {
      mql.removeEventListener("change", apply);
      document.body.style.overflow = "";
    };
  }, []);
  return null;
}
