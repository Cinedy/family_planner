import { describe, expect, it } from "vitest"
import { syncOpSchema } from "./ops"

describe("syncOpSchema", () => {
  it("accepts a dinner without ingredients (queued by an older app version)", () => {
    const op = syncOpSchema.parse({
      type: "dinner.set",
      id: "d1",
      weekStart: "2026-11-09",
      day: 2,
      title: "Taco",
      notes: null,
      recipeUrl: null,
    })
    expect(op.type === "dinner.set" && op.ingredients).toBeUndefined()
  })

  it("rejects ops that would put bad data in the database", () => {
    const bad = [
      { type: "dinner.set", id: "d1", weekStart: "9/11/2026", day: 2, title: "Taco", notes: null, recipeUrl: null },
      { type: "dinner.set", id: "d1", weekStart: "2026-11-09", day: 7, title: "Taco", notes: null, recipeUrl: null },
      { type: "grocery.upsert", id: "g1", name: "", quantity: null, checked: false, sortOrder: 0 },
      { type: "todo.upsert", id: "t1", title: "x", completed: false, dueDate: "soon", assignedToId: null, sortOrder: 0 },
      { type: "unknown.op", id: "x" },
    ]
    for (const op of bad) expect(syncOpSchema.safeParse(op).success, JSON.stringify(op)).toBe(false)
  })
})
