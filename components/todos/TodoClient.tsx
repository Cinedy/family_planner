"use client"

import { useState } from "react"
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
import { toggleTodoItem, deleteTodoItem, reorderTodoItems } from "@/app/actions/todos"
import type { SerializedTodoItem, FamilyMemberForTodos } from "@/types/todos"

interface TodoClientProps {
  listId: string
  initialItems: SerializedTodoItem[]
  familyMembers: FamilyMemberForTodos[]
  currentUserId: string
}

function SortableTodoItem({
  item,
  onToggle,
  onDelete,
}: {
  item: SerializedTodoItem
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
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
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>}
      />
    </div>
  )
}

export function TodoClient({ listId, initialItems, familyMembers, currentUserId }: TodoClientProps) {
  const [items, setItems] = useState(initialItems)
  const [sheetOpen, setSheetOpen] = useState(false)

  const incomplete = items.filter((i) => !i.completed)
  const completed = items.filter((i) => i.completed)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id)
      const newIndex = prev.findIndex((i) => i.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      const fd = new FormData()
      fd.set("orderedIds", JSON.stringify(reordered.map((i) => i.id)))
      reorderTodoItems(null, fd)
      return reordered
    })
  }

  function handleToggle(id: string, newCompleted: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completed: newCompleted } : i)))
    const fd = new FormData()
    fd.set("id", id)
    fd.set("completed", String(newCompleted))
    toggleTodoItem(null, fd)
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    const fd = new FormData()
    fd.set("id", id)
    deleteTodoItem(null, fd)
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
                  />
                ))}
              </>
            )}
          </div>
        </DndContext>
      )}

      <div className="pt-3">
        <Button
          onClick={() => setSheetOpen(true)}
          variant="outline"
          className="w-full min-h-[44px] gap-2"
        >
          <Plus className="size-4" />
          Legg til gjøremål
        </Button>
      </div>

      <TodoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        listId={listId}
        familyMembers={familyMembers}
        onSuccess={(item) => {
          setItems((prev) => [...prev, item])
          setSheetOpen(false)
        }}
      />
    </div>
  )
}
