"use client";

import { useEffect } from "react";

/** Locks body scroll so the snap container is the only scroll surface. */
export function SnapLock() {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return null;
}
