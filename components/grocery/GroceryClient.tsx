"use client"

import { useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { ArrowUpDown, ShoppingCart } from "lucide-react"
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
import { CategoryOrderSheet } from "./CategoryOrderSheet"
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
import { guessCategory, orderedCategories } from "@/lib/grocery-categories"
import { useMeta } from "@/components/sync/SyncProvider"
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
  const meta = useMeta()
  const items = useLiveQuery(async () => (await db.groceryItems.toArray()).sort(byOrder), [], [])
  const [orderSheet, setOrderSheet] = useState<{ key: number; open: boolean } | null>(null)
  // A new key per opening remounts the edit form with fresh values
  const openCount = useRef(0)
  const [editing, setEditing] = useState<{ key: number; item: LocalGroceryItem; open: boolean } | null>(null)

  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)
  const hasChecked = checked.length > 0

  // Unticked items grouped by store section, in the family's store order.
  // Items without a section yet (added before sections existed) are guessed from their name.
  const sectionOf = (item: LocalGroceryItem) => item.category ?? guessCategory(item.name, meta.categoryHints)
  const sections = orderedCategories(meta.categoryOrder)
    .map((category) => ({ category, items: unchecked.filter((i) => sectionOf(i) === category.key) }))
    .filter((section) => section.items.length > 0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Items can be dragged within their section; tap an item to move it to another one
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const section = sections.find((s) => s.items.some((i) => i.id === active.id))
    if (!section || !section.items.some((i) => i.id === over.id)) return
    const from = section.items.findIndex((i) => i.id === active.id)
    const to = section.items.findIndex((i) => i.id === over.id)
    const moved = arrayMove(section.items, from, to)
    const ordered = sections.flatMap((s) => (s === section ? moved : s.items))
    void reorderGroceryItems([...ordered, ...checked].map((i) => i.id))
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
            {sections.length > 0 && (
              <div className="flex justify-end -mt-1">
                <button
                  onClick={() => setOrderSheet({ key: ++openCount.current, open: true })}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground min-h-[32px] px-1"
                >
                  <ArrowUpDown className="size-3.5" />
                  Butikkrekkefølge
                </button>
              </div>
            )}
            {sections.map(({ category, items: sectionItems }) => (
              <section key={category.key} aria-label={category.label} className="pt-2 first:pt-0">
                <h2 className="flex items-center gap-1.5 px-1 pb-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span aria-hidden className="text-sm normal-case">
                    {category.emoji}
                  </span>
                  {category.label}
                </h2>
                <SortableContext items={sectionItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {sectionItems.map((item) => (
                    <SortableGroceryItem
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))}
                </SortableContext>
              </section>
            ))}

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

      {orderSheet && (
        <CategoryOrderSheet
          key={orderSheet.key}
          open={orderSheet.open}
          onOpenChange={(open) => setOrderSheet({ ...orderSheet, open })}
          order={meta.categoryOrder}
        />
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
