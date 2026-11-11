import { fromZonedTime } from "date-fns-tz"
import type { Table } from "dexie"
import { db, getMeta } from "@/lib/local/db"
import { requestSync } from "@/lib/local/sync"
import { eventFieldsFromForm, TIMEZONE, type EventFormValues } from "@/lib/calendar-utils"
import type { SyncOp } from "@/lib/sync/ops"
import type { SerializedEvent } from "@/types/calendar"
import type { LocalDinner, LocalGroceryItem, LocalTodoItem } from "@/types/sync"

// Every change is written to IndexedDB (the UI re-renders instantly via
// useLiveQuery) together with an outbox op, then synced in the background.

const newId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

async function change(tables: Table[], fn: (queue: (op: SyncOp) => void) => Promise<void>) {
  await db.transaction("rw", [...tables, db.outbox], async () => {
    const ops: SyncOp[] = []
    await fn((op) => ops.push(op))
    await db.outbox.bulkAdd(ops.map((op) => ({ op })))
  })
  requestSync()
}

// ─── Handleliste ───────────────────────────────────────────────────────────

export function addGroceryItem(name: string) {
  return change([db.groceryItems], async (queue) => {
    const items = await db.groceryItems.toArray()
    const item: LocalGroceryItem = {
      id: newId(),
      name: name.trim(),
      quantity: null,
      checked: false,
      sortOrder: items.reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1,
      createdAt: now(),
    }
    await db.groceryItems.add(item)
    queue({ type: "grocery.upsert", ...pick(item, ["id", "name", "quantity", "checked", "sortOrder"]) })
  })
}

export function setGroceryChecked(id: string, checked: boolean) {
  return change([db.groceryItems], async (queue) => {
    await db.groceryItems.update(id, { checked })
    queue({ type: "grocery.setChecked", id, checked })
  })
}

export function deleteGroceryItem(id: string) {
  return change([db.groceryItems], async (queue) => {
    await db.groceryItems.delete(id)
    queue({ type: "grocery.delete", id })
  })
}

export function reorderGroceryItems(ids: string[]) {
  return change([db.groceryItems], async (queue) => {
    await Promise.all(ids.map((id, index) => db.groceryItems.update(id, { sortOrder: index })))
    queue({ type: "grocery.reorder", ids })
  })
}

export function clearCheckedGroceryItems() {
  return change([db.groceryItems], async (queue) => {
    const ids = (await db.groceryItems.filter((i) => i.checked).toArray()).map((i) => i.id)
    await db.groceryItems.bulkDelete(ids)
    queue({ type: "grocery.clearChecked", ids })
  })
}

// ─── Gjøremål ──────────────────────────────────────────────────────────────

export function addTodoItem(input: { title: string; dueDate?: string; assignedToId?: string | null }) {
  return change([db.todoItems, db.members], async (queue) => {
    const items = await db.todoItems.toArray()
    const assignedTo = input.assignedToId ? ((await db.members.get(input.assignedToId)) ?? null) : null
    const item: LocalTodoItem = {
      id: newId(),
      title: input.title.trim(),
      completed: false,
      dueDate: input.dueDate ? fromZonedTime(`${input.dueDate}T00:00:00`, TIMEZONE).toISOString() : null,
      assignedToId: assignedTo?.id ?? null,
      assignedTo,
      sortOrder: items.reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1,
      createdAt: now(),
    }
    await db.todoItems.add(item)
    queue({
      type: "todo.upsert",
      ...pick(item, ["id", "title", "completed", "dueDate", "assignedToId", "sortOrder"]),
    })
  })
}

export function setTodoCompleted(id: string, completed: boolean) {
  return change([db.todoItems], async (queue) => {
    await db.todoItems.update(id, { completed })
    queue({ type: "todo.setCompleted", id, completed })
  })
}

export function deleteTodoItem(id: string) {
  return change([db.todoItems], async (queue) => {
    await db.todoItems.delete(id)
    queue({ type: "todo.delete", id })
  })
}

export function reorderTodoItems(ids: string[]) {
  return change([db.todoItems], async (queue) => {
    await Promise.all(ids.map((id, index) => db.todoItems.update(id, { sortOrder: index })))
    queue({ type: "todo.reorder", ids })
  })
}

// ─── Kalender ──────────────────────────────────────────────────────────────

export function saveEvent(existing: SerializedEvent | null, values: EventFormValues) {
  return change([db.events, db.members, db.meta], async (queue) => {
    const meta = await getMeta()
    if (!meta) throw new Error("Ikke synkronisert ennå")

    const fields = eventFieldsFromForm(values)
    const attendeeIds = values.attendeeIds ?? []
    const members = await db.members.bulkGet(attendeeIds)
    const event: SerializedEvent = {
      id: existing?.id ?? newId(),
      ...fields,
      familyId: meta.familyId,
      createdById: existing?.createdById ?? meta.me.id,
      createdBy: existing?.createdBy ?? { id: meta.me.id, name: meta.me.name, image: meta.me.image },
      attendees: members
        .filter((m) => m !== undefined)
        .map((m) => ({ userId: m.id, user: m })),
    }
    await db.events.put(event)
    queue({ type: "event.upsert", id: event.id, ...fields, attendeeIds })
  })
}

export function deleteEvent(id: string) {
  return change([db.events], async (queue) => {
    await db.events.delete(id)
    queue({ type: "event.delete", id })
  })
}

// ─── Måltider ──────────────────────────────────────────────────────────────

export function setDinner(input: Omit<LocalDinner, "id"> & { id?: string }) {
  return change([db.dinners], async (queue) => {
    const dinner: LocalDinner = { ...input, id: input.id ?? newId() }
    const sameDay = await db.dinners
      .where("weekStart")
      .equals(dinner.weekStart)
      .filter((d) => d.day === dinner.day && d.id !== dinner.id)
      .primaryKeys()
    await db.dinners.bulkDelete(sameDay)
    await db.dinners.put(dinner)
    queue({ type: "dinner.set", ...dinner })
  })
}

export function clearDinner(weekStart: string, day: number) {
  return change([db.dinners], async (queue) => {
    await db.dinners.where("weekStart").equals(weekStart).filter((d) => d.day === day).delete()
    queue({ type: "dinner.clear", weekStart, day })
  })
}

export function addRecipe(input: { title: string; description?: string; url?: string }) {
  return change([db.recipes, db.meta], async (queue) => {
    const meta = await getMeta()
    const recipe = {
      id: newId(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      url: input.url?.trim() || null,
      createdById: meta?.me.id ?? "",
      createdAt: now(),
    }
    await db.recipes.add(recipe)
    queue({ type: "recipe.upsert", ...pick(recipe, ["id", "title", "description", "url"]) })
  })
}

export function deleteRecipe(id: string) {
  return change([db.recipes], async (queue) => {
    await db.recipes.delete(id)
    queue({ type: "recipe.delete", id })
  })
}

function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, K>
}
