"use client";

import { useEffect } from "react";

/**
 * Registra `public/sw.js`. Sólo en producción: en desarrollo el cache del
 * service worker se mezcla con la recarga en caliente de Next.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Sin service worker la app funciona igual; sólo no es instalable.
      });
  }, []);
  return null;
}
