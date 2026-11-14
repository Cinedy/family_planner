import { fromZonedTime } from "date-fns-tz"
import type { Table } from "dexie"
import { db, getMeta } from "@/lib/local/db"
import { requestSync } from "@/lib/local/sync"
import { eventFieldsFromForm, TIMEZONE, type EventFormValues } from "@/lib/calendar-utils"
import type { SyncOp } from "@/lib/sync/ops"
import { guessCategory } from "@/lib/grocery-categories"
import { normalizeName } from "@/lib/ingredients"
import type { SerializedEvent } from "@/types/calendar"
import type { SerializedRecipe } from "@/types/meals"
import type { LocalDinner, LocalGroceryItem, LocalTodoItem } from "@/types/sync"

// Every change is written to IndexedDB (the UI re-renders instantly via
// useLiveQuery) together with an outbox op, then synced in the background.

const newId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

async function change<T = void>(tables: Table[], fn: (queue: (op: SyncOp) => void) => Promise<T>): Promise<T> {
  const result = await db.transaction("rw", [...tables, db.outbox], async () => {
    const ops: SyncOp[] = []
    const value = await fn((op) => ops.push(op))
    await db.outbox.bulkAdd(ops.map((op) => ({ op })))
    return value
  })
  requestSync()
  return result
}

const groceryUpsert = (item: LocalGroceryItem): SyncOp => ({
  type: "grocery.upsert",
  ...pick(item, ["id", "name", "quantity", "category", "checked", "sortOrder"]),
})
const todoUpsert = (item: LocalTodoItem): SyncOp => ({
  type: "todo.upsert",
  ...pick(item, ["id", "title", "completed", "dueDate", "assignedToId", "sortOrder"]),
})
const dueDateFromInput = (date: string | undefined) =>
  date ? fromZonedTime(`${date}T00:00:00`, TIMEZONE).toISOString() : null

// ─── Handleliste ───────────────────────────────────────────────────────────

export function addGroceryItem(name: string, quantity: string | null = null) {
  return change([db.groceryItems, db.meta], async (queue) => {
    const items = await db.groceryItems.toArray()
    const hints = (await getMeta())?.categoryHints
    const item: LocalGroceryItem = {
      id: newId(),
      name: name.trim(),
      quantity: quantity?.trim() || null,
      category: guessCategory(name, hints),
      checked: false,
      sortOrder: items.reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1,
      createdAt: now(),
    }
    await db.groceryItems.add(item)
    queue(groceryUpsert(item))
  })
}

/**
 * Edits an item. Pass `category` only when the user picked a section; otherwise a
 * renamed item is re-guessed from its new name. A section picked by hand is "learned":
 * the next item with this name goes straight to that section.
 */
export function updateGroceryItem(id: string, fields: { name: string; quantity: string | null; category?: string }) {
  return change([db.groceryItems, db.meta], async (queue) => {
    const item = await db.groceryItems.get(id)
    if (!item) return
    const meta = await getMeta()
    const name = fields.name.trim()
    const before = item.category ?? guessCategory(item.name, meta?.categoryHints)
    const category = fields.category ?? (name !== item.name ? guessCategory(name, meta?.categoryHints) : before)
    const updated: LocalGroceryItem = { ...item, name, quantity: fields.quantity?.trim() || null, category }
    await db.groceryItems.put(updated)
    queue(groceryUpsert(updated))

    if (fields.category && fields.category !== before && meta) {
      const hints = { ...meta.categoryHints, [normalizeName(name)]: fields.category }
      await db.meta.update("meta", { categoryHints: hints })
      queue({ type: "family.setCategoryHint", name, category: fields.category })
    }
  })
}

/** Puts deleted items back (the "Angre" button). */
export function restoreGroceryItems(items: LocalGroceryItem[]) {
  return change([db.groceryItems], async (queue) => {
    await db.groceryItems.bulkPut(items)
    items.forEach((item) => queue(groceryUpsert(item)))
  })
}

export function addGroceryItems(items: { name: string; quantity: string | null }[]) {
  if (items.length === 0) return Promise.resolve()
  return change([db.groceryItems, db.meta], async (queue) => {
    const existing = await db.groceryItems.toArray()
    const hints = (await getMeta())?.categoryHints
    let sortOrder = existing.reduce((max, i) => Math.max(max, i.sortOrder), -1)
    for (const input of items) {
      const item: LocalGroceryItem = {
        id: newId(),
        name: input.name.trim().slice(0, 128),
        quantity: input.quantity?.slice(0, 64) ?? null,
        category: guessCategory(input.name, hints),
        checked: false,
        sortOrder: ++sortOrder,
        createdAt: now(),
      }
      await db.groceryItems.add(item)
      queue(groceryUpsert(item))
    }
  })
}

export function setGroceryChecked(id: string, checked: boolean) {
  return change([db.groceryItems], async (queue) => {
    await db.groceryItems.update(id, { checked })
    queue({ type: "grocery.setChecked", id, checked })
  })
}

/** Returns the deleted item so it can be restored. */
export function deleteGroceryItem(id: string) {
  return change([db.groceryItems], async (queue) => {
    const item = await db.groceryItems.get(id)
    await db.groceryItems.delete(id)
    queue({ type: "grocery.delete", id })
    return item
  })
}

export function reorderGroceryItems(ids: string[]) {
  return change([db.groceryItems], async (queue) => {
    await Promise.all(ids.map((id, index) => db.groceryItems.update(id, { sortOrder: index })))
    queue({ type: "grocery.reorder", ids })
  })
}

/** Returns the removed items so they can be restored. */
export function clearCheckedGroceryItems() {
  return change([db.groceryItems], async (queue) => {
    const items = await db.groceryItems.filter((i) => i.checked).toArray()
    const ids = items.map((i) => i.id)
    await db.groceryItems.bulkDelete(ids)
    queue({ type: "grocery.clearChecked", ids })
    return items
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
      dueDate: dueDateFromInput(input.dueDate),
      assignedToId: assignedTo?.id ?? null,
      assignedTo,
      sortOrder: items.reduce((max, i) => Math.max(max, i.sortOrder), -1) + 1,
      createdAt: now(),
    }
    await db.todoItems.add(item)
    queue(todoUpsert(item))
  })
}

/** dueDate is the date input's value ("yyyy-MM-dd"), or "" for no due date. */
export function updateTodoItem(id: string, fields: { title: string; dueDate: string; assignedToId: string | null }) {
  return change([db.todoItems, db.members], async (queue) => {
    const item = await db.todoItems.get(id)
    if (!item) return
    const assignedTo = fields.assignedToId ? ((await db.members.get(fields.assignedToId)) ?? null) : null
    const updated: LocalTodoItem = {
      ...item,
      title: fields.title.trim(),
      dueDate: dueDateFromInput(fields.dueDate),
      assignedToId: assignedTo?.id ?? null,
      assignedTo,
    }
    await db.todoItems.put(updated)
    queue(todoUpsert(updated))
  })
}

/** Puts deleted to-dos back (the "Angre" button). */
export function restoreTodoItems(items: LocalTodoItem[]) {
  return change([db.todoItems], async (queue) => {
    await db.todoItems.bulkPut(items)
    items.forEach((item) => queue(todoUpsert(item)))
  })
}

export function setTodoCompleted(id: string, completed: boolean) {
  return change([db.todoItems], async (queue) => {
    await db.todoItems.update(id, { completed })
    queue({ type: "todo.setCompleted", id, completed })
  })
}

/** Returns the deleted to-do so it can be restored. */
export function deleteTodoItem(id: string) {
  return change([db.todoItems], async (queue) => {
    const item = await db.todoItems.get(id)
    await db.todoItems.delete(id)
    queue({ type: "todo.delete", id })
    return item
  })
}

/** Removes all completed to-dos; returns them so they can be restored. */
export function clearCompletedTodos() {
  return change([db.todoItems], async (queue) => {
    const items = await db.todoItems.filter((i) => i.completed).toArray()
    await db.todoItems.bulkDelete(items.map((i) => i.id))
    items.forEach((i) => queue({ type: "todo.delete", id: i.id }))
    return items
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

export function saveRecipe(
  existing: SerializedRecipe | null,
  input: { title: string; description?: string; url?: string; ingredients: string[] }
) {
  return change([db.recipes, db.meta], async (queue) => {
    const meta = await getMeta()
    const recipe: SerializedRecipe = {
      id: existing?.id ?? newId(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      url: input.url?.trim() || null,
      ingredients: input.ingredients,
      createdById: existing?.createdById ?? meta?.me.id ?? "",
      createdAt: existing?.createdAt ?? now(),
    }
    await db.recipes.put(recipe)
    queue({ type: "recipe.upsert", ...pick(recipe, ["id", "title", "description", "url", "ingredients"]) })
  })
}

export function deleteRecipe(id: string) {
  return change([db.recipes], async (queue) => {
    await db.recipes.delete(id)
    queue({ type: "recipe.delete", id })
  })
}

// ─── Familie ───────────────────────────────────────────────────────────────

export function setCategoryOrder(order: string[]) {
  return change([db.meta], async (queue) => {
    await db.meta.update("meta", { categoryOrder: order })
    queue({ type: "family.setCategoryOrder", order })
  })
}

export function setStaples(staples: string[]) {
  return change([db.meta], async (queue) => {
    await db.meta.update("meta", { staples })
    queue({ type: "family.setStaples", staples })
  })
}

function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return Object.fromEntries(keys.map((k) => [k, obj[k]])) as Pick<T, K>
}
