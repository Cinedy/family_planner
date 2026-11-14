"use client"

import { useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { CheckSquare, Plus } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { TodoItemRow } from "./TodoItemRow"
import { TodoSheet } from "./TodoSheet"
import { db } from "@/lib/local/db"
import {
  setTodoCompleted,
  deleteTodoItem,
  reorderTodoItems,
  restoreTodoItems,
  clearCompletedTodos,
} from "@/lib/local/mutations"
import { showUndo } from "@/lib/undo"
import type { LocalTodoItem } from "@/types/sync"

const byOrder = (a: LocalTodoItem, b: LocalTodoItem) =>
  a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)

function SortableTodoItem({
  item,
  onToggle,
  onDelete,
  onEdit,
}: {
  item: LocalTodoItem
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEdit: (item: LocalTodoItem) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-50 relative z-10" : ""}
    >
      <TodoItemRow
        item={item}
        onToggle={onToggle}
        onDelete={onDelete}
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>}
      />
    </div>
  )
}

export function TodoClient() {
  const items = useLiveQuery(async () => (await db.todoItems.toArray()).sort(byOrder), [], [])
  const familyMembers = useLiveQuery(() => db.members.toArray(), [], [])
  // A new key per opening remounts the form with fresh values
  const openCount = useRef(0)
  const [sheet, setSheet] = useState<{ key: number; item: LocalTodoItem | null; open: boolean } | null>(null)
  const openSheet = (item: LocalTodoItem | null) => setSheet({ key: ++openCount.current, item, open: true })

  const incomplete = items.filter((i) => !i.completed)
  const completed = items.filter((i) => i.completed)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = incomplete.findIndex((i) => i.id === active.id)
    const newIndex = incomplete.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(incomplete, oldIndex, newIndex)
    void reorderTodoItems([...reordered, ...completed].map((i) => i.id))
  }

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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="space-y-0.5">
            <SortableContext items={incomplete.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {incomplete.map((item) => (
                <SortableTodoItem
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={openSheet}
                />
              ))}
            </SortableContext>

            {completed.length > 0 && (
              <>
                {incomplete.length > 0 && <div className="border-t border-border my-2" />}
                {completed.map((item) => (
                  <TodoItemRow
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={openSheet}
                  />
                ))}
              </>
            )}
          </div>
        </DndContext>
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
