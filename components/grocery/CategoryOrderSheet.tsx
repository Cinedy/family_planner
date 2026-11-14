"use client"

import { useState } from "react"
import { GripVertical } from "lucide-react"
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { DEFAULT_CATEGORY_ORDER, orderedCategories, type CATEGORIES } from "@/lib/grocery-categories"
import { setCategoryOrder } from "@/lib/local/mutations"

type Category = (typeof CATEGORIES)[number]

function SortableCategory({ category }: { category: Category }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.key })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 min-h-[48px] bg-popover ${isDragging ? "opacity-60 relative z-10" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Flytt ${category.label}`}
        className="touch-none cursor-grab active:cursor-grabbing p-2 -ml-2 text-muted-foreground"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="text-lg leading-none" aria-hidden>
        {category.emoji}
      </span>
      <span className="text-sm">{category.label}</span>
    </li>
  )
}

interface CategoryOrderSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: string[] | undefined
}

// The parent remounts this component (via `key`) each time it opens.
export function CategoryOrderSheet({ open, onOpenChange, order }: CategoryOrderSheetProps) {
  const [categories, setCategories] = useState(() => orderedCategories(order))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function save(next: Category[]) {
    setCategories(next)
    void setCategoryOrder(next.map((c) => c.key))
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = categories.findIndex((c) => c.key === active.id)
    const to = categories.findIndex((c) => c.key === over.id)
    save(arrayMove(categories, from, to))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[calc(var(--vv-height,100dvh)*0.9)] rounded-t-2xl overflow-y-auto pb-safe">
        <SheetHeader>
          <SheetTitle>Butikkrekkefølge</SheetTitle>
          <SheetDescription>Dra avdelingene i den rekkefølgen du går gjennom butikken. Gjelder hele familien.</SheetDescription>
        </SheetHeader>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => c.key)} strategy={verticalListSortingStrategy}>
            <ul className="px-4 divide-y divide-border">
              {categories.map((category) => (
                <SortableCategory key={category.key} category={category} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <SheetFooter className="px-4 pb-4 gap-2">
          <Button className="w-full min-h-[44px]" onClick={() => onOpenChange(false)}>
            Ferdig
          </Button>
          <Button
            variant="ghost"
            className="w-full min-h-[44px] text-muted-foreground"
            onClick={() => save(orderedCategories(DEFAULT_CATEGORY_ORDER))}
          >
            Tilbakestill
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
