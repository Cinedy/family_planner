"use client"

import { createContext, useContext, useEffect, useSyncExternalStore } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Loader2, WifiOff } from "lucide-react"
import { db, getMeta } from "@/lib/local/db"
import { sync, syncStatusStore } from "@/lib/local/sync"
import type { LocalMeta } from "@/types/sync"

const POLL_MS = 30_000
const MetaContext = createContext<LocalMeta | null>(null)

/** Signed-in user + family info from the last sync. Only available inside SyncProvider. */
export function useMeta(): LocalMeta {
  const meta = useContext(MetaContext)
  if (!meta) throw new Error("useMeta must be used inside SyncProvider")
  return meta
}

export function useSyncStatus() {
  const state = useSyncExternalStore(syncStatusStore.subscribe, syncStatusStore.get, syncStatusStore.getServer)
  const pending = useLiveQuery(() => db.outbox.count(), [], 0)
  return { state, pending }
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const meta = useLiveQuery(async () => (await getMeta()) ?? null, [], "loading" as const)
  const { state } = useSyncStatus()

  useEffect(() => {
    void sync()

    const onVisible = () => {
      if (document.visibilityState === "visible") void sync()
    }
    const onOnline = () => void sync()
    window.addEventListener("online", onOnline)
    document.addEventListener("visibilitychange", onVisible)
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void sync()
    }, POLL_MS)

    return () => {
      window.removeEventListener("online", onOnline)
      document.removeEventListener("visibilitychange", onVisible)
      clearInterval(timer)
    }
  }, [])

  if (meta === "loading") return null

  // First launch on this device: nothing stored locally yet
  if (meta === null) {
    const offline = state === "offline"
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
        {offline ? <WifiOff className="size-8 opacity-50" /> : <Loader2 className="size-8 animate-spin opacity-50" />}
        <p className="text-sm">
          {offline ? "Koble til internett for å hente familiens data første gang." : "Henter data…"}
        </p>
      </div>
    )
  }

  return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>
}
