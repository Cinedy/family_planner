"use client"

import { useRef, useState } from "react"
import { UtensilsCrossed, ExternalLink, Plus, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RecipeSheet } from "./RecipeSheet"
import type { SerializedRecipe } from "@/types/meals"

interface RecipesTabProps {
  recipes: SerializedRecipe[]
}

function subtitle(recipe: SerializedRecipe) {
  const count = recipe.ingredients?.length ?? 0
  const parts = [count > 0 ? `${count} ${count === 1 ? "ingrediens" : "ingredienser"}` : null, recipe.description]
  return parts.filter(Boolean).join(" · ")
}

export function RecipesTab({ recipes }: RecipesTabProps) {
  // A new key per opening remounts the form with fresh values
  const openCount = useRef(0)
  const [sheet, setSheet] = useState<{ key: number; recipe: SerializedRecipe | null; open: boolean } | null>(null)

  const open = (recipe: SerializedRecipe | null) => setSheet({ key: ++openCount.current, recipe, open: true })

  return (
    <div className="space-y-1">
      {recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <UtensilsCrossed className="size-10 mb-3 opacity-30" />
          <p className="font-medium text-sm">Ingen oppskrifter ennå</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="flex items-center gap-2 min-h-[52px]">
              <button
                onClick={() => open(recipe)}
                className="flex-1 min-w-0 flex items-center gap-2 text-left rounded-lg px-1 py-2 hover:bg-muted active:bg-muted/80 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{recipe.title}</p>
                  {subtitle(recipe) && <p className="text-xs text-muted-foreground truncate">{subtitle(recipe)}</p>}
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>

              {recipe.url && (
                <a
                  href={recipe.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 size-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Åpne oppskrift"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pt-3">
        <Button onClick={() => open(null)} variant="outline" className="w-full min-h-[44px] gap-2">
          <Plus className="size-4" />
          Legg til oppskrift
        </Button>
      </div>

      {sheet && (
        <RecipeSheet
          key={sheet.key}
          open={sheet.open}
          onOpenChange={(isOpen) => setSheet({ ...sheet, open: isOpen })}
          recipe={sheet.recipe}
        />
      )}
    </div>
  )
}
