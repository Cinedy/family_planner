export type SerializedRecipe = {
  id: string
  title: string
  description: string | null
  url: string | null
  ingredients: string[]
  createdById: string
  createdAt: string
}
