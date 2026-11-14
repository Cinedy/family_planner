// A single "Slettet · Angre" message at a time, shown by <UndoToast />.

export type UndoMessage = { id: number; message: string; undo: () => void }

const DURATION_MS = 5000

let current: UndoMessage | null = null
let nextId = 0
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function set(next: UndoMessage | null) {
  current = next
  listeners.forEach((l) => l())
}

/** Show a message with an "Angre" button for a few seconds. Replaces any message already showing. */
export function showUndo(message: string, undo: () => void) {
  clearTimeout(timer)
  set({ id: ++nextId, message, undo })
  timer = setTimeout(() => set(null), DURATION_MS)
}

export function dismissUndo() {
  clearTimeout(timer)
  set(null)
}

export const undoStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get: () => current,
  getServer: (): UndoMessage | null => null,
}
