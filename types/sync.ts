import type { SerializedEvent } from "@/types/calendar"
import type { SerializedRecipe } from "@/types/meals"

export type Member = { id: string; name: string | null; image: string | null }

export type LocalGroceryItem = {
  id: string
  name: string
  quantity: string | null
  checked: boolean
  sortOrder: number
  createdAt: string
}

export type LocalTodoItem = {
  id: string
  title: string
  completed: boolean
  dueDate: string | null
  assignedToId: string | null
  assignedTo: Member | null
  sortOrder: number
  createdAt: string
}

export type LocalDinner = {
  id: string
  weekStart: string // yyyy-MM-dd (Monday)
  day: number // 0 = Monday … 6 = Sunday
  title: string
  notes: string | null
  recipeUrl: string | null
  ingredients: string[]
}

export type LocalMeta = {
  key: "meta"
  me: Member & { email: string | null }
  role: "admin" | "member"
  familyId: string
  familyName: string
  /** Basisvarer: start unticked when adding ingredients to the grocery list */
  staples: string[]
  lastSyncedAt: string
}

export type Snapshot = {
  me: Member & { email: string | null }
  role: "admin" | "member"
  familyId: string
  familyName: string
  staples: string[]
  members: Member[]
  groceryItems: LocalGroceryItem[]
  todoItems: LocalTodoItem[]
  events: SerializedEvent[]
  dinners: LocalDinner[]
  recipes: SerializedRecipe[]
}
