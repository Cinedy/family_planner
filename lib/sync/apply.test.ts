import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@/lib/generated/prisma/client"
import type { SyncOp } from "./ops"

// A fake transaction client: every model method is a mock we can program and inspect
const models = [
  "groceryList",
  "groceryItem",
  "todoList",
  "todoItem",
  "calendarEvent",
  "eventAttendee",
  "mealPlan",
  "mealPlanEntry",
  "recipe",
  "family",
] as const
const methods = ["findUnique", "findFirst", "create", "update", "updateMany", "deleteMany", "upsert", "createMany", "delete"]

type FakeModel = Record<string, ReturnType<typeof vi.fn>>
let tx: Record<(typeof models)[number], FakeModel>
const transaction = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: (fn: (t: unknown) => unknown) => transaction(fn) },
}))

const { applyOps } = await import("./apply")
type ApplyContext = import("./apply").ApplyContext

const ctx: ApplyContext = {
  userId: "me",
  familyId: "fam",
  role: "member",
  memberIds: new Set(["me", "partner"]),
}

beforeEach(() => {
  tx = Object.fromEntries(
    models.map((m) => [m, Object.fromEntries(methods.map((fn) => [fn, vi.fn().mockResolvedValue(null)]))])
  ) as typeof tx
  transaction.mockReset().mockImplementation((fn: (t: unknown) => unknown) => fn(tx))
})

const run = (op: SyncOp, context = ctx) => applyOps([op], context)

describe("groceries", () => {
  it("creates a new item in the family's list, keeping the client's id", async () => {
    tx.groceryList.findFirst.mockResolvedValue({ id: "list1" })
    await run({ type: "grocery.upsert", id: "g1", name: "Melk", quantity: "1 l", checked: false, sortOrder: 3 })
    expect(tx.groceryItem.create).toHaveBeenCalledWith({
      data: { id: "g1", listId: "list1", addedById: "me", name: "Melk", quantity: "1 l", checked: false, sortOrder: 3 },
    })
  })

  it("ignores an item that belongs to another family", async () => {
    tx.groceryItem.findUnique.mockResolvedValue({ id: "g1", list: { familyId: "other" } })
    await run({ type: "grocery.upsert", id: "g1", name: "Melk", quantity: null, checked: true, sortOrder: 0 })
    expect(tx.groceryItem.update).not.toHaveBeenCalled()
    expect(tx.groceryItem.create).not.toHaveBeenCalled()
  })

  it("scopes ticks, deletes and reordering to the family", async () => {
    await applyOps(
      [
        { type: "grocery.setChecked", id: "g1", checked: true },
        { type: "grocery.delete", id: "g2" },
        { type: "grocery.reorder", ids: ["g3", "g4"] },
      ],
      ctx
    )
    expect(tx.groceryItem.updateMany).toHaveBeenCalledWith({
      where: { id: "g1", list: { familyId: "fam" } },
      data: { checked: true },
    })
    expect(tx.groceryItem.deleteMany).toHaveBeenCalledWith({ where: { id: "g2", list: { familyId: "fam" } } })
    expect(tx.groceryItem.updateMany).toHaveBeenCalledWith({
      where: { id: "g4", list: { familyId: "fam" } },
      data: { sortOrder: 1 },
    })
  })
})

describe("grocery sections", () => {
  it("doesn't clear the section when an older app version leaves it out", async () => {
    tx.groceryItem.findUnique.mockResolvedValue({ id: "g1", list: { familyId: "fam" } })
    await run({ type: "grocery.upsert", id: "g1", name: "Melk", quantity: null, checked: true, sortOrder: 0 })
    expect(tx.groceryItem.update.mock.calls[0][0].data).not.toHaveProperty("category")
  })

  it("adds a learned section to the family's hints", async () => {
    tx.family.findUnique.mockResolvedValue({ groceryCategoryHints: { melk: "meieri" } })
    await run({ type: "family.setCategoryHint", name: "  Pizzadeig ", category: "meieri" })
    expect(tx.family.update).toHaveBeenCalledWith({
      where: { id: "fam" },
      data: { groceryCategoryHints: { melk: "meieri", pizzadeig: "meieri" } },
    })
  })
})

describe("todos", () => {
  it("drops an assignee who isn't in the family", async () => {
    tx.todoList.findFirst.mockResolvedValue({ id: "todos" })
    await run({
      type: "todo.upsert",
      id: "t1",
      title: "Støvsuge",
      completed: false,
      dueDate: null,
      assignedToId: "stranger",
      sortOrder: 0,
    })
    expect(tx.todoItem.create.mock.calls[0][0].data.assignedToId).toBeNull()
  })
})

describe("calendar", () => {
  const upsert = (attendeeIds: string[]): SyncOp => ({
    type: "event.upsert",
    id: "e1",
    title: "Foreldremøte",
    description: null,
    startTime: "2026-11-20T17:00:00.000Z",
    endTime: null,
    allDay: false,
    color: null,
    recurrence: null,
    attendeeIds,
  })

  it("only lets the creator or an admin change an event", async () => {
    tx.calendarEvent.findUnique.mockResolvedValue({ id: "e1", familyId: "fam", createdById: "partner" })

    await run(upsert([]))
    expect(tx.calendarEvent.update).not.toHaveBeenCalled()

    await run(upsert([]), { ...ctx, role: "admin" })
    expect(tx.calendarEvent.update).toHaveBeenCalledOnce()
  })

  it("only adds attendees who are family members", async () => {
    await run(upsert(["me", "stranger", "partner"]))
    expect(tx.eventAttendee.createMany).toHaveBeenCalledWith({
      data: [
        { eventId: "e1", userId: "me" },
        { eventId: "e1", userId: "partner" },
      ],
    })
  })
})

describe("meals", () => {
  const dinner = {
    type: "dinner.set" as const,
    id: "d1",
    weekStart: "2026-11-09",
    day: 2,
    title: "Taco",
    notes: null,
    recipeUrl: null,
  }

  it("keeps one dinner per day", async () => {
    tx.mealPlan.upsert.mockResolvedValue({ id: "plan1" })
    await run({ ...dinner, ingredients: ["400 g kjøttdeig"] })
    expect(tx.mealPlanEntry.deleteMany).toHaveBeenCalledWith({
      where: { planId: "plan1", day: 2, mealType: "dinner", id: { not: "d1" } },
    })
    expect(tx.mealPlanEntry.upsert.mock.calls[0][0].update.ingredients).toEqual(["400 g kjøttdeig"])
  })

  it("doesn't wipe ingredients when an older app version sends a dinner without them", async () => {
    tx.mealPlan.upsert.mockResolvedValue({ id: "plan1" })
    await run(dinner)
    expect(tx.mealPlanEntry.upsert.mock.calls[0][0].update).not.toHaveProperty("ingredients")
  })
})

describe("applyOps error handling", () => {
  it("skips an op with a data error and carries on with the rest", async () => {
    transaction
      .mockImplementationOnce(() => {
        throw new Prisma.PrismaClientKnownRequestError("Foreign key failed", { code: "P2003", clientVersion: "test" })
      })
      .mockImplementation((fn: (t: unknown) => unknown) => fn(tx))

    const result = await applyOps(
      [
        { type: "recipe.delete", id: "r1" },
        { type: "recipe.delete", id: "r2" },
      ],
      ctx
    )
    expect(result.skipped).toBe(1)
    expect(tx.recipe.deleteMany).toHaveBeenCalledWith({ where: { id: "r2", familyId: "fam" } })
  })

  it("rethrows connection errors so the client keeps its changes and retries", async () => {
    transaction.mockImplementation(() => {
      throw new Error("Connection terminated")
    })
    await expect(run({ type: "recipe.delete", id: "r1" })).rejects.toThrow("Connection terminated")
  })
})
