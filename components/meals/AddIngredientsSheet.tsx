"use client"

import { useMemo, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Check, ShoppingCart } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { db } from "@/lib/local/db"
import { addGroceryItems, setStaples } from "@/lib/local/mutations"
import { isStaple, normalizeName, parseIngredient } from "@/lib/ingredients"
import { useMeta } from "@/components/sync/SyncProvider"

export type IngredientSource = { title: string; ingredients: string[] }

type Row = {
  key: string // normalized name
  name: string
  quantities: string[]
  dishes: string[]
}

/** Merge the same ingredient from several dinners into one row. */
function buildRows(sources: IngredientSource[]): Row[] {
  const rows = new Map<string, Row>()
  for (const source of sources) {
    for (const line of source.ingredients) {
      const { name, quantity } = parseIngredient(line)
      const key = normalizeName(name)
      if (!key) continue
      const row = rows.get(key) ?? { key, name, quantities: [], dishes: [] }
      if (quantity) row.quantities.push(quantity)
      if (!row.dishes.includes(source.title)) row.dishes.push(source.title)
      rows.set(key, row)
    }
  }
  return [...rows.values()]
}

interface AddIngredientsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  sources: IngredientSource[]
}

// The parent remounts this component (via `key`) each time it opens, so the
// initial selection is computed fresh from the current basics list.
export function AddIngredientsSheet({ open, onOpenChange, title, sources }: AddIngredientsSheetProps) {
  const meta = useMeta()
  const staples = meta.staples ?? []
  const rows = useMemo(() => buildRows(sources), [sources])
  const showDishes = sources.length > 1

  const onList = useLiveQuery(
    async () => new Set((await db.groceryItems.filter((i) => !i.checked).toArray()).map((i) => normalizeName(i.name))),
    [],
    new Set<string>()
  )

  // Everything starts ticked except basics ("salt", "olje", …)
  const [selected, setSelected] = useState(() => new Set(rows.filter((r) => !isStaple(r.name, staples)).map((r) => r.key)))

  const toAdd = rows.filter((r) => selected.has(r.key) && !onList.has(r.key))

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleStaple(row: Row) {
    const staple = isStaple(row.name, staples)
    void setStaples(staple ? staples.filter((s) => normalizeName(s) !== row.key) : [...staples, row.key])
    // Marking as a basic means "I have it": untick it, and the reverse
    setSelected((prev) => {
      const next = new Set(prev)
      if (staple) next.add(row.key)
      else next.delete(row.key)
      return next
    })
  }

  function handleAdd() {
    void addGroceryItems(
      toAdd.map((r) => ({ name: r.name, quantity: r.quantities.length ? r.quantities.join(" + ") : null }))
    )
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[calc(var(--vv-height,100dvh)*0.9)] rounded-t-2xl overflow-y-auto pb-safe">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Fjern haken for det du allerede har hjemme.</SheetDescription>
        </SheetHeader>

        <ul className="px-4 divide-y divide-border">
          {rows.map((row) => {
            const already = onList.has(row.key)
            const checked = !already && selected.has(row.key)
            const staple = isStaple(row.name, staples)
            return (
              <li key={row.key} className="flex items-center gap-3 min-h-[52px] py-1.5">
                <button
                  type="button"
                  onClick={() => toggle(row.key)}
                  disabled={already}
                  aria-label={checked ? `Ikke kjøp ${row.name}` : `Kjøp ${row.name}`}
                  className="flex flex-1 min-w-0 items-center gap-3 text-left disabled:opacity-60"
                >
                  <span
                    className={cn(
                      "size-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                      checked ? "bg-primary border-primary text-primary-foreground" : "border-input bg-background"
                    )}
                  >
                    {checked && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("text-sm block truncate", !checked && "text-muted-foreground")}>
                      {row.name}
                      {row.quantities.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-1.5">{row.quantities.join(" + ")}</span>
                      )}
                    </span>
                    {(already || showDishes) && (
                      <span className="text-xs text-muted-foreground block truncate">
                        {already ? "Står allerede på listen" : row.dishes.join(", ")}
                      </span>
                    )}
                  </span>
                </button>
                {!already && (
                  <button
                    type="button"
                    onClick={() => toggleStaple(row)}
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors min-h-[32px]",
                      staple ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground"
                    )}
                  >
                    Basisvare
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        <SheetFooter className="px-4 pb-4 gap-2">
          <Button className="w-full min-h-[44px] gap-2" disabled={toAdd.length === 0} onClick={handleAdd}>
            <ShoppingCart className="size-4" />
            {toAdd.length === 0
              ? "Ingenting å legge til"
              : `Legg til ${toAdd.length} ${toAdd.length === 1 ? "vare" : "varer"} i handlelisten`}
          </Button>
          <Button variant="ghost" className="w-full min-h-[44px]" onClick={() => onOpenChange(false)}>
            Hopp over
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
