import { db, dataTables } from "@/lib/local/db"
import type { Snapshot } from "@/types/sync"

// ─── Status store (read with useSyncStatus in SyncProvider) ────────────────

export type SyncState = "idle" | "syncing" | "offline" | "error"

let state: SyncState = "idle"
const listeners = new Set<() => void>()

function setState(next: SyncState) {
  if (next === state) return
  state = next
  listeners.forEach((l) => l())
}

export const syncStatusStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get: () => state,
  getServer: (): SyncState => "idle",
}

// ─── Sync ──────────────────────────────────────────────────────────────────

const PUSH_BATCH = 200

let running: Promise<void> | null = null
let runAgain = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/** Push the outbox, then pull a fresh snapshot. Only one sync runs at a time. */
export function sync(): Promise<void> {
  if (running) {
    runAgain = true
    return running
  }
  running = (async () => {
    do {
      runAgain = false
      await syncOnce()
    } while (runAgain)
  })().finally(() => {
    running = null
  })
  return running
}

/** Ask for a sync soon; several calls in a row collapse into one. */
export function requestSync() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void sync()
  }, 300)
}

/** Returns false (and navigates away) when the session or family is gone. */
function handleAuth(res: Response): boolean {
  if (res.status === 401 || (res.redirected && new URL(res.url).pathname.startsWith("/login"))) {
    window.location.href = "/login"
    return false
  }
  if (res.status === 409) {
    window.location.href = "/onboarding"
    return false
  }
  return true
}

async function syncOnce() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setState("offline")
    return
  }
  setState("syncing")

  try {
    // 1. Push local changes
    const pending = await db.outbox.orderBy("seq").limit(PUSH_BATCH).toArray()
    if (pending.length > 0) {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ops: pending.map((p) => p.op) }),
        cache: "no-store",
      })
      if (!handleAuth(res)) return
      if (!res.ok) throw new Error(`push failed: ${res.status}`)
      await db.outbox.bulkDelete(pending.map((p) => p.seq!))

      if ((await db.outbox.count()) > 0) {
        runAgain = true
        return
      }
    }

    // 2. Pull the family's data
    const res = await fetch("/api/sync", { cache: "no-store" })
    if (!handleAuth(res)) return
    if (!res.ok) throw new Error(`pull failed: ${res.status}`)
    const snap = (await res.json()) as Snapshot

    await db.transaction("rw", [...dataTables(), db.outbox], async () => {
      // A change was made while we were downloading: push it first, pull again after
      if ((await db.outbox.count()) > 0) {
        runAgain = true
        return
      }
      await Promise.all(dataTables().map((t) => t.clear()))
      await Promise.all([
        db.groceryItems.bulkPut(snap.groceryItems),
        db.todoItems.bulkPut(snap.todoItems),
        db.events.bulkPut(snap.events),
        db.dinners.bulkPut(snap.dinners),
        db.recipes.bulkPut(snap.recipes),
        db.members.bulkPut(snap.members),
        db.meta.put({
          key: "meta",
          me: snap.me,
          role: snap.role,
          familyId: snap.familyId,
          familyName: snap.familyName,
          staples: snap.staples,
          categoryOrder: snap.categoryOrder,
          categoryHints: snap.categoryHints,
          lastSyncedAt: new Date().toISOString(),
        }),
      ])
    })

    setState("idle")
  } catch (err) {
    console.warn("[sync]", err)
    setState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error")
  }
}

/** Remove all local data (used on sign-out so the next user starts clean). */
export async function clearLocalData() {
  await db.delete()
  if ("caches" in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }
}
