"use client"

import { useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
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
import { GroceryEditSheet } from "./GroceryEditSheet"
import { db } from "@/lib/local/db"
import {
  addGroceryItem,
  setGroceryChecked,
  deleteGroceryItem,
  clearCheckedGroceryItems,
  reorderGroceryItems,
  restoreGroceryItems,
} from "@/lib/local/mutations"
import { parseIngredient } from "@/lib/ingredients"
import { showUndo } from "@/lib/undo"
import type { LocalGroceryItem } from "@/types/sync"

const byOrder = (a: LocalGroceryItem, b: LocalGroceryItem) =>
  a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)

function SortableGroceryItem({
  item,
  onToggle,
  onDelete,
  onEdit,
}: {
  item: LocalGroceryItem
  onToggle: (id: string, checked: boolean) => void
  onDelete: (id: string) => void
  onEdit: (item: LocalGroceryItem) => void
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
        onEdit={onEdit}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>}
      />
    </div>
  )
}

export function GroceryClient() {
  const items = useLiveQuery(async () => (await db.groceryItems.toArray()).sort(byOrder), [], [])
  // A new key per opening remounts the edit form with fresh values
  const openCount = useRef(0)
  const [editing, setEditing] = useState<{ key: number; item: LocalGroceryItem; open: boolean } | null>(null)

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
    const oldIndex = unchecked.findIndex((i) => i.id === active.id)
    const newIndex = unchecked.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(unchecked, oldIndex, newIndex)
    void reorderGroceryItems([...reordered, ...checked].map((i) => i.id))
  }

  const handleToggle = (id: string, newChecked: boolean) => void setGroceryChecked(id, newChecked)
  const handleEdit = (item: LocalGroceryItem) => setEditing({ key: ++openCount.current, item, open: true })

  async function handleDelete(id: string) {
    const item = await deleteGroceryItem(id)
    if (item) showUndo(`«${item.name}» slettet`, () => void restoreGroceryItems([item]))
  }

  // "2 l melk" → melk · 2 l
  function handleAdd(text: string) {
    const { name, quantity } = parseIngredient(text)
    void addGroceryItem(name, quantity)
  }

  async function handleClearChecked() {
    const removed = await clearCheckedGroceryItems()
    if (removed.length > 0) {
      showUndo(`${removed.length} ${removed.length === 1 ? "vare" : "varer"} fjernet`, () => void restoreGroceryItems(removed))
    }
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
                  onEdit={handleEdit}
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
                    onEdit={handleEdit}
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

      {editing && (
        <GroceryEditSheet
          key={editing.key}
          open={editing.open}
          onOpenChange={(open) => setEditing({ ...editing, open })}
          item={editing.item}
          onDelete={(item) => void handleDelete(item.id)}
        />
      )}
    </div>
  )
}
