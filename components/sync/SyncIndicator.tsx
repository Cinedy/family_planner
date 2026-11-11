"use client"

import { CloudOff, Loader2 } from "lucide-react"
import { useSyncStatus } from "./SyncProvider"

export function SyncIndicator() {
  const { state, pending } = useSyncStatus()

  if (state === "offline") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <CloudOff className="size-3.5" />
        Frakoblet{pending > 0 && ` · ${pending} venter`}
      </span>
    )
  }
  if (state === "syncing" && pending > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Lagrer…
      </span>
    )
  }
  if (state === "error" && pending > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <CloudOff className="size-3.5" />
        {pending} ikke lagret ennå
      </span>
    )
  }
  return null
}
