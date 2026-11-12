import "fake-indexeddb/auto"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Snapshot } from "@/types/sync"

// Browser bits the sync engine uses
const fetchMock = vi.fn()
const location = { href: "/grocery" }
vi.stubGlobal("fetch", fetchMock)
vi.stubGlobal("navigator", { onLine: true })
vi.stubGlobal("window", { location })

// Mutations normally schedule a background sync; tests call sync() themselves
vi.mock("@/lib/local/sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sync")>()),
  requestSync: vi.fn(),
}))

const { db } = await import("./db")
const { sync, syncStatusStore } = await import("./sync")
const { addGroceryItem, setGroceryChecked } = await import("./mutations")

function snapshot(groceryNames: string[] = []): Snapshot {
  return {
    me: { id: "me", name: "Silje", email: null, image: null },
    role: "admin",
    familyId: "fam",
    familyName: "Familien",
    staples: ["salt"],
    members: [{ id: "me", name: "Silje", image: null }],
    groceryItems: groceryNames.map((name, i) => ({
      id: `server-${i}`,
      name,
      quantity: null,
      checked: false,
      sortOrder: i,
      createdAt: "2026-11-12T10:00:00.000Z",
    })),
    todoItems: [],
    events: [],
    dinners: [],
    recipes: [],
  }
}

const json = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, redirected: false, url: "", json: async () => body }) as Response

const calls = () => fetchMock.mock.calls.map(([, init]) => (init?.method ?? "GET") as string)

beforeEach(async () => {
  await db.delete()
  await db.open()
  fetchMock.mockReset()
  location.href = "/grocery"
})

describe("local-first changes", () => {
  it("shows a change locally right away and queues it for the server", async () => {
    await addGroceryItem("Melk")

    const items = await db.groceryItems.toArray()
    expect(items.map((i) => i.name)).toEqual(["Melk"])
    const queued = await db.outbox.toArray()
    expect(queued.map((q) => q.op.type)).toEqual(["grocery.upsert"])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("pushes queued changes, then replaces local data with the server's", async () => {
    await addGroceryItem("Melk")
    fetchMock.mockResolvedValueOnce(json({ ok: true })).mockResolvedValueOnce(json(snapshot(["Melk", "Brød"])))

    await sync()

    expect(calls()).toEqual(["POST", "GET"])
    const pushed = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(pushed.ops[0]).toMatchObject({ type: "grocery.upsert", name: "Melk" })
    expect(await db.outbox.count()).toBe(0)
    expect((await db.groceryItems.toArray()).map((i) => i.name).sort()).toEqual(["Brød", "Melk"])
    expect((await db.meta.get("meta"))?.familyName).toBe("Familien")
    expect(syncStatusStore.get()).toBe("idle")
  })
})

describe("offline", () => {
  it("keeps changes when the server can't be reached and sends them later", async () => {
    await addGroceryItem("Melk")
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))

    await sync()
    expect(await db.outbox.count()).toBe(1)
    expect((await db.groceryItems.toArray()).map((i) => i.name)).toEqual(["Melk"])
    expect(syncStatusStore.get()).toBe("error")

    fetchMock.mockResolvedValueOnce(json({ ok: true })).mockResolvedValueOnce(json(snapshot(["Melk"])))
    await sync()
    expect(await db.outbox.count()).toBe(0)
  })

  it("keeps changes when the server has an error", async () => {
    await addGroceryItem("Melk")
    fetchMock.mockResolvedValueOnce(json({ error: "boom" }, 500))

    await sync()
    expect(await db.outbox.count()).toBe(1)
  })
})

describe("changes made while downloading", () => {
  it("are not overwritten: they're pushed first and the data is pulled again", async () => {
    fetchMock.mockResolvedValueOnce(json(snapshot(["Melk"])))
    await sync() // "Melk" is now on the phone, unticked
    fetchMock.mockClear()

    fetchMock
      // 1st pull: the user ticks off an item while the download is in flight
      .mockImplementationOnce(async () => {
        await setGroceryChecked("server-0", true)
        return json(snapshot(["Melk"]))
      })
      .mockResolvedValueOnce(json({ ok: true })) // push of the tick
      .mockResolvedValueOnce(json({ ...snapshot(["Melk"]), groceryItems: [{ ...snapshot(["Melk"]).groceryItems[0], checked: true }] }))

    await sync()

    expect(calls()).toEqual(["GET", "POST", "GET"])
    expect(await db.outbox.count()).toBe(0)
    expect((await db.groceryItems.get("server-0"))?.checked).toBe(true)
  })
})

describe("signed out", () => {
  it("goes to the login page when the session has expired", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "unauthorized" }, 401))
    await sync()
    expect(location.href).toBe("/login")
  })

  it("goes to onboarding when the user is no longer in a family", async () => {
    fetchMock.mockResolvedValueOnce(json({ noFamily: true }, 409))
    await sync()
    expect(location.href).toBe("/onboarding")
  })
})
