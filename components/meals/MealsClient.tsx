"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { WeekPlanTab } from "./WeekPlanTab"
import { RecipesTab } from "./RecipesTab"
import type { SerializedMealPlan, SerializedRecipe } from "@/types/meals"

interface MealsClientProps {
  initialPlan: SerializedMealPlan | null
  initialRecipes: SerializedRecipe[]
  weekStart: string
}

export function MealsClient({ initialPlan, initialRecipes, weekStart }: MealsClientProps) {
  const [activeTab, setActiveTab] = useState<"ukesplan" | "oppskrifter">("ukesplan")
  const [recipes, setRecipes] = useState<SerializedRecipe[]>(initialRecipes)

  function handleRecipeAdded(recipe: SerializedRecipe) {
    setRecipes((prev) => [...prev, recipe].sort((a, b) => a.title.localeCompare(b.title)))
  }

  function handleRecipeDeleted(id: string) {
    setRecipes((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Måltidsplan</h1>
        <div className="flex gap-1 p-1 bg-muted rounded-full">
          <button
            onClick={() => setActiveTab("ukesplan")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              activeTab === "ukesplan"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Ukesplan
          </button>
          <button
            onClick={() => setActiveTab("oppskrifter")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              activeTab === "oppskrifter"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Oppskrifter
          </button>
        </div>
      </div>

      {activeTab === "ukesplan" ? (
        <WeekPlanTab
          key={weekStart}
          initialPlan={initialPlan}
          weekStart={weekStart}
          recipes={recipes}
        />
      ) : (
        <RecipesTab
          recipes={recipes}
          onRecipeAdded={handleRecipeAdded}
          onRecipeDeleted={handleRecipeDeleted}
        />
      )}
    </div>
  )
}
