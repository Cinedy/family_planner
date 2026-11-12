"use client"

import { useState } from "react"
import { ChevronLeft, ExternalLink } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { setDinner, clearDinner } from "@/lib/local/mutations"
import { ingredientsFromText, ingredientsToText } from "@/lib/ingredients"
import type { SerializedDinnerEntry, SerializedRecipe } from "@/types/meals"

interface DinnerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weekStart: string
  day: number
  entry: SerializedDinnerEntry | null
  recipes: SerializedRecipe[]
  /** Called after saving when the dinner has new or changed ingredients */
  onIngredientsSaved: (dinner: { title: string; ingredients: string[] }) => void
}

// The parent remounts this component (via `key`) each time the sheet opens,
// so the form starts from the current entry without syncing state in an effect.

export function DinnerSheet({
  open,
  onOpenChange,
  weekStart,
  day,
  entry,
  recipes,
  onIngredientsSaved,
}: DinnerSheetProps) {
  const [mode, setMode] = useState<"form" | "picker">(entry === null && recipes.length > 0 ? "picker" : "form")
  const [title, setTitle] = useState(entry?.title ?? "")
  const [notes, setNotes] = useState(entry?.notes ?? "")
  const [recipeUrl, setRecipeUrl] = useState(entry?.recipeUrl ?? "")
  const [ingredientsText, setIngredientsText] = useState(ingredientsToText(entry?.ingredients))
  const [confirmClear, setConfirmClear] = useState(false)

  function handleClose() {
    onOpenChange(false)
  }

  function handlePickRecipe(recipe: SerializedRecipe) {
    setTitle(recipe.title)
    setRecipeUrl(recipe.url ?? "")
    // Picking a recipe always brings its ingredients
    setIngredientsText(ingredientsToText(recipe.ingredients))
    setMode("form")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const ingredients = ingredientsFromText(ingredientsText)
    void setDinner({
      id: entry?.id,
      weekStart,
      day,
      title: title.trim(),
      notes: notes.trim() || null,
      recipeUrl: recipeUrl.trim() || null,
      ingredients,
    })
    handleClose()

    const changed = ingredientsToText(entry?.ingredients) !== ingredientsToText(ingredients)
    if (ingredients.length > 0 && changed) onIngredientsSaved({ title: title.trim(), ingredients })
  }

  function handleClear() {
    void clearDinner(weekStart, day)
    handleClose()
  }

  const inputClass = "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  const labelClass = "text-sm font-medium text-foreground"

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="max-h-[calc(var(--vv-height,100dvh)*0.85)] rounded-t-2xl overflow-y-auto pb-safe">
        {mode === "picker" ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode("form")}
                  className="gap-1 -ml-1"
                >
                  <ChevronLeft className="size-4" />
                  {entry === null ? "Skriv inn selv" : "Tilbake"}
                </Button>
              </div>
              <SheetTitle>Velg oppskrift</SheetTitle>
            </SheetHeader>

            <div className="space-y-0.5 p-4 pt-2">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handlePickRecipe(recipe)}
                  className="w-full text-left flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted active:bg-muted/80 transition-colors min-h-[44px]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{recipe.title}</p>
                    {recipe.description && (
                      <p className="text-xs text-muted-foreground truncate">{recipe.description}</p>
                    )}
                  </div>
                  {recipe.url && (
                    <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{entry ? "Rediger middag" : "Legg til middag"}</SheetTitle>
            </SheetHeader>

            <form onSubmit={handleSubmit} className="space-y-4 p-4 pt-2">
              <div className="space-y-1">
                <label className={labelClass}>Hva er til middag?</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tittel"
                  className={inputClass}
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Ingredienser (én per linje)</label>
                <textarea
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                  placeholder={"400 g kjøttdeig\n1 løk\n1 boks hakkede tomater"}
                  rows={4}
                  className={`${inputClass} h-auto resize-none`}
                />
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Notater (valgfritt)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ekstra info..."
                  rows={2}
                  className={`${inputClass} h-auto resize-none`}
                />
              </div>

              {recipes.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-[44px]"
                  onClick={() => setMode("picker")}
                >
                  Velg fra oppskrifter
                </Button>
              )}

              <Button
                type="submit"
                className="w-full min-h-[44px]"
                disabled={!title.trim()}
              >
                {entry ? "Lagre" : "Legg til"}
              </Button>
            </form>

            {entry && (
              <SheetFooter className="border-t border-border pt-2 px-4 pb-4">
                {!confirmClear ? (
                  <Button
                    variant="destructive"
                    className="w-full min-h-[44px]"
                    onClick={() => setConfirmClear(true)}
                  >
                    Fjern middag
                  </Button>
                ) : (
                  <div className="w-full space-y-2">
                    <p className="text-sm text-center text-muted-foreground">Er du sikker?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 min-h-[44px]"
                        onClick={() => setConfirmClear(false)}
                      >
                        Avbryt
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 min-h-[44px]"
                        onClick={handleClear}
                      >
                        Ja
                      </Button>
                    </div>
                  </div>
                )}
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
