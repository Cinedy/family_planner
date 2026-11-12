"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { deleteRecipe, saveRecipe } from "@/lib/local/mutations"
import { ingredientsFromText, ingredientsToText } from "@/lib/ingredients"
import type { SerializedRecipe } from "@/types/meals"

interface RecipeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = new recipe */
  recipe: SerializedRecipe | null
}

// The parent remounts this component (via `key`) each time it opens.
export function RecipeSheet({ open, onOpenChange, recipe }: RecipeSheetProps) {
  const [title, setTitle] = useState(recipe?.title ?? "")
  const [description, setDescription] = useState(recipe?.description ?? "")
  const [url, setUrl] = useState(recipe?.url ?? "")
  const [ingredientsText, setIngredientsText] = useState(ingredientsToText(recipe?.ingredients))
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    void saveRecipe(recipe, { title, description, url, ingredients: ingredientsFromText(ingredientsText) })
    onOpenChange(false)
  }

  function handleDelete() {
    if (recipe) void deleteRecipe(recipe.id)
    onOpenChange(false)
  }

  const inputClass = "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  const labelClass = "text-sm font-medium text-foreground"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[calc(var(--vv-height,100dvh)*0.85)] rounded-t-2xl overflow-y-auto pb-safe">
        <SheetHeader>
          <SheetTitle>{recipe ? "Rediger oppskrift" : "Ny oppskrift"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-4 pt-2">
          <div className="space-y-1">
            <label className={labelClass}>Navn</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Navn på oppskrift"
              className={inputClass}
              autoFocus={!recipe}
              required
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Ingredienser (én per linje)</label>
            <textarea
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder={"400 g kjøttdeig\n1 løk\n1 pakke tacokrydder"}
              rows={5}
              className={`${inputClass} h-auto resize-none`}
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Beskrivelse (valgfritt)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kort beskrivelse"
              rows={2}
              className={`${inputClass} h-auto resize-none`}
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Lenke til oppskrift (valgfritt)</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          <Button type="submit" className="w-full min-h-[44px]" disabled={!title.trim()}>
            {recipe ? "Lagre" : "Legg til"}
          </Button>
        </form>

        {recipe && (
          <SheetFooter className="border-t border-border pt-2 px-4 pb-4">
            {!confirmDelete ? (
              <Button variant="destructive" className="w-full min-h-[44px]" onClick={() => setConfirmDelete(true)}>
                Slett oppskrift
              </Button>
            ) : (
              <div className="w-full space-y-2">
                <p className="text-sm text-center text-muted-foreground">Er du sikker?</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setConfirmDelete(false)}>
                    Avbryt
                  </Button>
                  <Button variant="destructive" className="flex-1 min-h-[44px]" onClick={handleDelete}>
                    Slett
                  </Button>
                </div>
              </div>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
