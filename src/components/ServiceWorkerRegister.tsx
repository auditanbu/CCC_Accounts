"use client";

import { useEffect } from "react";

/**
 * Registered only in production — a service worker fighting Next's dev-mode
 * hot reload is a familiar source of "why won't my change show up" bugs.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability just degrades without a worker; nothing else depends on it.
    });
  }, []);

  return null;
}
