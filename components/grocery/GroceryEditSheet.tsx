"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { inputClass, labelClass } from "@/components/ui/form-styles"
import { updateGroceryItem } from "@/lib/local/mutations"
import { guessCategory, orderedCategories } from "@/lib/grocery-categories"
import { useMeta } from "@/components/sync/SyncProvider"
import { cn } from "@/lib/utils"
import type { LocalGroceryItem } from "@/types/sync"

interface GroceryEditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: LocalGroceryItem
  onDelete: (item: LocalGroceryItem) => void
}

// The parent remounts this component (via `key`) each time it opens.
export function GroceryEditSheet({ open, onOpenChange, item, onDelete }: GroceryEditSheetProps) {
  const meta = useMeta()
  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(item.quantity ?? "")
  // Only set when the user taps a section; otherwise follow the (possibly renamed) item
  const [picked, setPicked] = useState<string | null>(null)

  const renamed = name.trim() !== item.name
  const shown =
    picked ??
    (renamed ? guessCategory(name, meta.categoryHints) : (item.category ?? guessCategory(item.name, meta.categoryHints)))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    void updateGroceryItem(item.id, { name, quantity: quantity || null, category: picked ?? undefined })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[calc(var(--vv-height,100dvh)*0.85)] rounded-t-2xl overflow-y-auto pb-safe">
        <SheetHeader>
          <SheetTitle>Rediger vare</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-4 pt-2">
          <div className="space-y-1">
            <label className={labelClass}>Vare</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Antall (valgfritt)</label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="f.eks. 2 l"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Avdeling</label>
            <div className="flex flex-wrap gap-2">
              {orderedCategories(meta.categoryOrder).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setPicked(c.key)}
                  aria-pressed={shown === c.key}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors min-h-[36px]",
                    shown === c.key
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-input bg-background hover:bg-muted"
                  )}
                >
                  <span aria-hidden>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full min-h-[44px]" disabled={!name.trim()}>
            Lagre
          </Button>
        </form>

        <SheetFooter className="border-t border-border pt-2 px-4 pb-4">
          <Button
            variant="destructive"
            className="w-full min-h-[44px]"
            onClick={() => {
              onOpenChange(false)
              onDelete(item)
            }}
          >
            Slett vare
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
