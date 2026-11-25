import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/local/sync", () => ({ requestSync: vi.fn() }))

const { db } = await import("./db")
const m = await import("./mutations")

const ops = async () => (await db.outbox.toArray()).map((e) => e.op)

beforeEach(async () => {
  await db.delete()
  await db.open()
  await db.members.put({ id: "partner", name: "Ola", image: null })
})

describe("grocery editing", () => {
  it("edits name and quantity but keeps the tick and position; a fixed typo gets a fresh section", async () => {
    await m.addGroceryItem("Mel k", null)
    const [item] = await db.groceryItems.toArray()
    await m.setGroceryChecked(item.id, true)
    await db.outbox.clear()

    await m.updateGroceryItem(item.id, { name: " Melk ", quantity: "2 l" })

    expect(item.category).toBe("torrvarer") // "Mel k" looked like flour
    expect(await db.groceryItems.get(item.id)).toMatchObject({ name: "Melk", quantity: "2 l", checked: true, category: "meieri" })
    expect(await ops()).toEqual([
      {
        type: "grocery.upsert",
        id: item.id,
        name: "Melk",
        quantity: "2 l",
        category: "meieri",
        checked: true,
        sortOrder: item.sortOrder,
      },
    ])
  })

  it("can undo a delete, putting the same item back", async () => {
    await m.addGroceryItem("Egg", "6")
    const [item] = await db.groceryItems.toArray()

    const deleted = await m.deleteGroceryItem(item.id)
    expect(await db.groceryItems.count()).toBe(0)

    await m.restoreGroceryItems([deleted!])
    expect(await db.groceryItems.get(item.id)).toEqual(item)
    expect((await ops()).map((o) => o.type)).toEqual(["grocery.upsert", "grocery.delete", "grocery.upsert"])
  })

  it("can undo clearing ticked items", async () => {
    await m.addGroceryItem("Brød")
    await m.addGroceryItem("Ost")
    const bread = (await db.groceryItems.toArray()).find((i) => i.name === "Brød")!
    await m.setGroceryChecked(bread.id, true)

    const removed = await m.clearCheckedGroceryItems()
    expect(removed.map((i) => i.name)).toEqual(["Brød"])
    expect((await db.groceryItems.toArray()).map((i) => i.name)).toEqual(["Ost"])

    await m.restoreGroceryItems(removed)
    expect(await db.groceryItems.count()).toBe(2)
  })
})

describe("grocery sections", () => {
  beforeEach(async () => {
    await db.meta.put({
      key: "meta",
      me: { id: "me", name: "Silje", email: null, image: null },
      role: "admin",
      familyId: "fam",
      familyName: "Familien",
      staples: [],
      categoryOrder: [],
      categoryHints: {},
      lastSyncedAt: "2026-11-14T10:00:00.000Z",
    })
  })

  it("guesses the section when adding", async () => {
    await m.addGroceryItem("lettmelk")
    await m.addGroceryItems([{ name: "kyllingfilet", quantity: "400 g" }])
    const items = await db.groceryItems.toArray()
    expect(Object.fromEntries(items.map((i) => [i.name, i.category]))).toEqual({
      lettmelk: "meieri",
      kyllingfilet: "kjott-fisk",
    })
  })

  it("learns a section picked by hand and uses it next time", async () => {
    await m.addGroceryItem("pizzadeig") // guessed as frozen
    const [item] = await db.groceryItems.toArray()
    expect(item.category).toBe("frys")
    await db.outbox.clear()

    await m.updateGroceryItem(item.id, { name: "pizzadeig", quantity: null, category: "meieri" })
    expect((await ops()).map((o) => o.type)).toEqual(["grocery.upsert", "family.setCategoryHint"])
    expect((await db.meta.get("meta"))?.categoryHints).toEqual({ pizzadeig: "meieri" })

    await m.deleteGroceryItem(item.id)
    await m.addGroceryItem("Pizzadeig")
    expect((await db.groceryItems.toArray())[0].category).toBe("meieri")
  })

  it("doesn't learn when the section wasn't changed", async () => {
    await m.addGroceryItem("melk")
    const [item] = await db.groceryItems.toArray()
    await db.outbox.clear()
    await m.updateGroceryItem(item.id, { name: "melk", quantity: "1 l", category: "meieri" })
    expect((await ops()).map((o) => o.type)).toEqual(["grocery.upsert"])
  })
})

describe("to-do editing", () => {
  it("changes text, notes, due date and assignee, and can clear them", async () => {
    await m.addTodoItem({ title: "Støvsuge" })
    const [todo] = await db.todoItems.toArray()

    await m.updateTodoItem(todo.id, {
      title: "Støvsuge stua",
      notes: " Husk under sofaen ",
      dueDate: "2026-11-20",
      assignedToId: "partner",
    })
    expect(await db.todoItems.get(todo.id)).toMatchObject({
      title: "Støvsuge stua",
      notes: "Husk under sofaen",
      dueDate: "2026-11-19T23:00:00.000Z", // midnight in Oslo
      assignedToId: "partner",
      assignedTo: { id: "partner", name: "Ola", image: null },
    })

    await m.updateTodoItem(todo.id, { title: "Støvsuge stua", notes: "", dueDate: "", assignedToId: null })
    expect(await db.todoItems.get(todo.id)).toMatchObject({ notes: null, dueDate: null, assignedToId: null, assignedTo: null })
  })

  it("clears only completed to-dos, and can undo it", async () => {
    await m.addTodoItem({ title: "Ferdig" })
    await m.addTodoItem({ title: "Gjenstår" })
    const done = (await db.todoItems.toArray()).find((t) => t.title === "Ferdig")!
    await m.setTodoCompleted(done.id, true)
    await db.outbox.clear()

    const removed = await m.clearCompletedTodos()
    expect(removed.map((t) => t.title)).toEqual(["Ferdig"])
    expect((await db.todoItems.toArray()).map((t) => t.title)).toEqual(["Gjenstår"])
    expect(await ops()).toEqual([{ type: "todo.delete", id: done.id }])

    await m.restoreTodoItems(removed)
    expect((await db.todoItems.get(done.id))?.completed).toBe(true)
  })
})

describe("repeating events", () => {
  beforeEach(async () => {
    await db.meta.put({
      key: "meta",
      me: { id: "me", name: "Silje", email: null, image: null },
      role: "admin",
      familyId: "fam",
      familyName: "Familien",
      staples: [],
      categoryOrder: [],
      categoryHints: {},
      lastSyncedAt: "2026-11-15T10:00:00.000Z",
    })
  })

  const weekly = { title: "Fotball", date: "2026-11-02", startTime: "17:00", repeats: "true" as const, recurrenceType: "weekly" as const }

  it("«Bare denne»: skips that day in the series and adds a one-off event", async () => {
    await m.saveEvent(null, weekly)
    const [series] = await db.events.toArray()
    await db.outbox.clear()

    const occ = new Date("2026-11-16T16:00:00.000Z") // Mon 16 Nov 17:00 in Oslo
    await m.saveEventOccurrence(series, occ, { ...weekly, date: "2026-11-17", startTime: "18:00" })

    const events = await db.events.toArray()
    const updated = events.find((e) => e.id === series.id)!
    const oneOff = events.find((e) => e.id !== series.id)!
    expect(updated.recurrenceExceptions).toEqual(["2026-11-16"])
    expect(updated.recurrence).toBe(series.recurrence)
    expect(oneOff).toMatchObject({ title: "Fotball", recurrence: null, startTime: "2026-11-17T17:00:00.000Z" })
    expect((await ops()).map((o) => o.type)).toEqual(["event.upsert", "event.upsert"])
  })

  it("«Bare denne» delete only skips that day", async () => {
    await m.saveEvent(null, weekly)
    const [series] = await db.events.toArray()
    await m.deleteEventOccurrence(series, new Date("2026-11-09T16:00:00.000Z"))
    const after = await db.events.toArray()
    expect(after).toHaveLength(1)
    expect(after[0].recurrenceExceptions).toEqual(["2026-11-09"])
  })

  it("keeps skipped days when the whole series is edited", async () => {
    await m.saveEvent(null, weekly)
    const [series] = await db.events.toArray()
    await m.deleteEventOccurrence(series, new Date("2026-11-09T16:00:00.000Z"))
    const withSkip = (await db.events.get(series.id))!
    await m.saveEvent(withSkip, { ...weekly, title: "Fotballtrening" })
    expect(await db.events.get(series.id)).toMatchObject({ title: "Fotballtrening", recurrenceExceptions: ["2026-11-09"] })
  })
})
