"use client"

import { useState } from "react"
import { ShoppingCart } from "lucide-react"
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
import { GroceryItemRow } from "./GroceryItemRow"
import { GroceryAddInput } from "./GroceryAddInput"
import {
  addGroceryItem,
  toggleGroceryItem,
  deleteGroceryItem,
  clearCheckedGroceryItems,
  reorderGroceryItems,
} from "@/app/actions/grocery"
import type { SerializedGroceryItem } from "@/types/grocery"

interface GroceryClientProps {
  listId: string
  initialItems: SerializedGroceryItem[]
}

function SortableGroceryItem({
  item,
  onToggle,
  onDelete,
}: {
  item: SerializedGroceryItem
  onToggle: (id: string, checked: boolean) => void
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
      <GroceryItemRow
        item={item}
        onToggle={onToggle}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>}
      />
    </div>
  )
}

export function GroceryClient({ listId, initialItems }: GroceryClientProps) {
  const [items, setItems] = useState(initialItems)

  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)
  const hasChecked = checked.length > 0

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
      reorderGroceryItems(null, fd)
      return reordered
    })
  }

  function handleToggle(id: string, newChecked: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: newChecked } : i)))
    const fd = new FormData()
    fd.set("id", id)
    fd.set("checked", String(newChecked))
    toggleGroceryItem(null, fd)
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    const fd = new FormData()
    fd.set("id", id)
    deleteGroceryItem(null, fd)
  }

  async function handleAdd(name: string) {
    const fd = new FormData()
    fd.set("listId", listId)
    fd.set("name", name)
    const result = await addGroceryItem(null, fd)
    if (result.item) {
      setItems((prev) => [...prev, result.item!])
    }
  }

  function handleClearChecked() {
    setItems((prev) => prev.filter((i) => !i.checked))
    const fd = new FormData()
    fd.set("listId", listId)
    clearCheckedGroceryItems(null, fd)
  }

  return (
    <div className="space-y-1">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <ShoppingCart className="size-10 mb-3 opacity-30" />
          <p className="font-medium text-sm">Handlelisten er tom</p>
          <p className="text-xs mt-1">Legg til en vare nedenfor</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="space-y-0.5">
            <SortableContext items={unchecked.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {unchecked.map((item) => (
                <SortableGroceryItem
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>

            {checked.length > 0 && (
              <>
                {unchecked.length > 0 && <div className="border-t border-border my-2" />}
                {checked.map((item) => (
                  <GroceryItemRow
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

      <GroceryAddInput onAdd={handleAdd} />

      {hasChecked && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChecked}
            className="w-full text-muted-foreground"
          >
            Fjern avkryssede ({checked.length})
          </Button>
        </div>
      )}
    </div>
  )
}
