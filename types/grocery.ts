export type SerializedGroceryItem = {
  id: string
  name: string
  quantity: string | null
  checked: boolean
  createdAt: string
}

export type SerializedGroceryList = {
  id: string
  items: SerializedGroceryItem[]
}
