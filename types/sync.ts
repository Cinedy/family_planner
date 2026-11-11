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
}

export type LocalMeta = {
  key: "meta"
  me: Member & { email: string | null }
  role: "admin" | "member"
  familyId: string
  familyName: string
  lastSyncedAt: string
}

export type Snapshot = {
  me: Member & { email: string | null }
  role: "admin" | "member"
  familyId: string
  familyName: string
  members: Member[]
  groceryItems: LocalGroceryItem[]
  todoItems: LocalTodoItem[]
  events: SerializedEvent[]
  dinners: LocalDinner[]
  recipes: SerializedRecipe[]
}
