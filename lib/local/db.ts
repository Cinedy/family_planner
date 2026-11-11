import Dexie, { type Table } from "dexie"
import type { SerializedEvent } from "@/types/calendar"
import type { SerializedRecipe } from "@/types/meals"
import type { SyncOp } from "@/lib/sync/ops"
import type { LocalDinner, LocalGroceryItem, LocalMeta, LocalTodoItem, Member } from "@/types/sync"

export type OutboxEntry = { seq?: number; op: SyncOp }

class FamilyPlannerDB extends Dexie {
  groceryItems!: Table<LocalGroceryItem, string>
  todoItems!: Table<LocalTodoItem, string>
  events!: Table<SerializedEvent, string>
  dinners!: Table<LocalDinner, string>
  recipes!: Table<SerializedRecipe, string>
  members!: Table<Member, string>
  meta!: Table<LocalMeta, string>
  outbox!: Table<OutboxEntry, number>

  constructor() {
    super("familyPlanner")
    this.version(1).stores({
      groceryItems: "id",
      todoItems: "id",
      events: "id",
      dinners: "id, weekStart",
      recipes: "id",
      members: "id",
      meta: "key",
      outbox: "++seq",
    })
  }
}

export const db = new FamilyPlannerDB()

/** All tables that hold synced data (everything except the outbox). */
export const dataTables = () => [
  db.groceryItems,
  db.todoItems,
  db.events,
  db.dinners,
  db.recipes,
  db.members,
  db.meta,
]

export async function getMeta(): Promise<LocalMeta | undefined> {
  return db.meta.get("meta")
}
