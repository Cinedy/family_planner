"use client"

import { useSyncExternalStore } from "react"
import { dismissUndo, undoStore } from "@/lib/undo"

export function UndoToast() {
  const message = useSyncExternalStore(undoStore.subscribe, undoStore.get, undoStore.getServer)

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-above-tabbar z-50 flex justify-center">
      {message && (
        <div
          key={message.id}
          className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg animate-in fade-in slide-in-from-bottom-2"
        >
          <span className="flex-1 truncate">{message.message}</span>
          <button
            onClick={() => {
              message.undo()
              dismissUndo()
            }}
            className="min-h-[36px] shrink-0 px-2 font-semibold underline-offset-2 hover:underline"
          >
            Angre
          </button>
        </div>
      )}
    </div>
  )
}
