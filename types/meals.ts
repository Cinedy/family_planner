export type SerializedDinnerEntry = {
  id: string
  planId: string
  day: number
  title: string
  notes: string | null
  recipeUrl: string | null
}

export type SerializedMealPlan = {
  id: string
  weekStart: string // "yyyy-MM-dd"
  entries: SerializedDinnerEntry[]
}

export type SerializedRecipe = {
  id: string
  title: string
  description: string | null
  url: string | null
  createdById: string
  createdAt: string
}
