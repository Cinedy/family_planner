export type { LocalDinner as SerializedDinnerEntry } from "@/types/sync"

export type SerializedRecipe = {
  id: string
  title: string
  description: string | null
  url: string | null
  createdById: string
  createdAt: string
}
