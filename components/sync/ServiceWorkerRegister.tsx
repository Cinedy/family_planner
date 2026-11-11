"use client"

import { useEffect } from "react"

/** Registers /sw.js in production so the app shell opens offline. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => console.warn("[sw] registration failed", err))
  }, [])
  return null
}
