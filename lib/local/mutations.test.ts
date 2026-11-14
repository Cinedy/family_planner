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
  it("edits name and quantity but keeps the tick and position", async () => {
    await m.addGroceryItem("Mel k", null)
    const [item] = await db.groceryItems.toArray()
    await m.setGroceryChecked(item.id, true)
    await db.outbox.clear()

    await m.updateGroceryItem(item.id, { name: " Melk ", quantity: "2 l" })

    expect(await db.groceryItems.get(item.id)).toMatchObject({ name: "Melk", quantity: "2 l", checked: true })
    expect(await ops()).toEqual([
      { type: "grocery.upsert", id: item.id, name: "Melk", quantity: "2 l", checked: true, sortOrder: item.sortOrder },
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

describe("to-do editing", () => {
  it("changes text, due date and assignee, and can remove the due date", async () => {
    await m.addTodoItem({ title: "Støvsuge" })
    const [todo] = await db.todoItems.toArray()

    await m.updateTodoItem(todo.id, { title: "Støvsuge stua", dueDate: "2026-11-20", assignedToId: "partner" })
    expect(await db.todoItems.get(todo.id)).toMatchObject({
      title: "Støvsuge stua",
      dueDate: "2026-11-19T23:00:00.000Z", // midnight in Oslo
      assignedToId: "partner",
      assignedTo: { id: "partner", name: "Ola", image: null },
    })

    await m.updateTodoItem(todo.id, { title: "Støvsuge stua", dueDate: "", assignedToId: null })
    expect(await db.todoItems.get(todo.id)).toMatchObject({ dueDate: null, assignedToId: null, assignedTo: null })
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
