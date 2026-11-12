export type { LocalDinner as SerializedDinnerEntry } from "@/types/sync"

export type SerializedRecipe = {
  id: string
  title: string
  description: string | null
  url: string | null
  ingredients: string[]
  createdById: string
  createdAt: string
}
