"use client"

import { useState } from "react"
import { UtensilsCrossed, ExternalLink, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RecipeSheet } from "./RecipeSheet"
import { deleteRecipe } from "@/app/actions/meals"
import type { SerializedRecipe } from "@/types/meals"

interface RecipesTabProps {
  recipes: SerializedRecipe[]
  onRecipeAdded: (recipe: SerializedRecipe) => void
  onRecipeDeleted: (id: string) => void
}

export function RecipesTab({ recipes, onRecipeAdded, onRecipeDeleted }: RecipesTabProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  function handleDelete(id: string) {
    onRecipeDeleted(id)
    const fd = new FormData()
    fd.set("id", id)
    deleteRecipe(null, fd)
  }

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
            <div
              key={recipe.id}
              className="flex items-center gap-3 px-1 min-h-[52px] group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{recipe.title}</p>
                {recipe.description && (
                  <p className="text-xs text-muted-foreground truncate">{recipe.description}</p>
                )}
              </div>

              {recipe.url && (
                <a
                  href={recipe.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Åpne oppskrift"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDelete(recipe.id)}
                aria-label="Slett oppskrift"
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="pt-3">
        <Button
          onClick={() => setSheetOpen(true)}
          variant="outline"
          className="w-full min-h-[44px] gap-2"
        >
          <Plus className="size-4" />
          Legg til oppskrift
        </Button>
      </div>

      <RecipeSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={(recipe) => {
          onRecipeAdded(recipe)
          setSheetOpen(false)
        }}
      />
    </div>
  )
}
