import { useEffect, useState } from "react"

/**
 * The current time, refreshed every minute and when the app comes back into view —
 * so "today" stays right in a home-screen app that is left open overnight.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const onVisible = () => {
      if (document.visibilityState === "visible") tick()
    }
    const timer = setInterval(tick, intervalMs)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [intervalMs])
  return now
}
