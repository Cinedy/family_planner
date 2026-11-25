"use client"

import { useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { CheckSquare, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TodoItemRow } from "./TodoItemRow"
import { TodoSheet } from "./TodoSheet"
import { db } from "@/lib/local/db"
import {
  setTodoCompleted,
  deleteTodoItem,
  restoreTodoItems,
  clearCompletedTodos,
} from "@/lib/local/mutations"
import { showUndo } from "@/lib/undo"
import { byDueDate } from "@/lib/due-dates"
import type { LocalTodoItem } from "@/types/sync"

export function TodoClient() {
  const items = useLiveQuery(async () => (await db.todoItems.toArray()).sort(byDueDate), [], [])
  const familyMembers = useLiveQuery(() => db.members.toArray(), [], [])
  // A new key per opening remounts the form with fresh values
  const openCount = useRef(0)
  const [sheet, setSheet] = useState<{ key: number; item: LocalTodoItem | null; open: boolean } | null>(null)
  const openSheet = (item: LocalTodoItem | null) => setSheet({ key: ++openCount.current, item, open: true })

  const incomplete = items.filter((i) => !i.completed)
  const completed = items.filter((i) => i.completed)

  const handleToggle = (id: string, newCompleted: boolean) => void setTodoCompleted(id, newCompleted)

  async function handleDelete(id: string) {
    const item = await deleteTodoItem(id)
    if (item) showUndo(`«${item.title}» slettet`, () => void restoreTodoItems([item]))
  }

  async function handleClearCompleted() {
    const removed = await clearCompletedTodos()
    if (removed.length > 0) {
      showUndo(`${removed.length} fullførte fjernet`, () => void restoreTodoItems(removed))
    }
  }

  return (
    <div className="space-y-1">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <CheckSquare className="size-10 mb-3 opacity-30" />
          <p className="font-medium text-sm">Ingen gjøremål ennå</p>
        </div>
      ) : (
        // Sorted by due date: overdue first, then today, later, and no due date last
        <div className="space-y-0.5">
          {incomplete.map((item) => (
            <TodoItemRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} onEdit={openSheet} />
          ))}

          {completed.length > 0 && (
            <>
              {incomplete.length > 0 && <div className="border-t border-border my-2" />}
              {completed.map((item) => (
                <TodoItemRow key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} onEdit={openSheet} />
              ))}
            </>
          )}
        </div>
      )}

      <div className="pt-3">
        <Button
          onClick={() => openSheet(null)}
          variant="outline"
          className="w-full min-h-[44px] gap-2"
        >
          <Plus className="size-4" />
          Legg til gjøremål
        </Button>
      </div>

      {completed.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleClearCompleted()}
          className="w-full text-muted-foreground"
        >
          Fjern fullførte ({completed.length})
        </Button>
      )}

      {sheet && (
        <TodoSheet
          key={sheet.key}
          open={sheet.open}
          onOpenChange={(open) => setSheet({ ...sheet, open })}
          familyMembers={familyMembers}
          item={sheet.item}
          onDelete={(item) => void handleDelete(item.id)}
        />
      )}
    </div>
  )
}
