import { describe, expect, it } from "vitest"
import { byDueDate, dueDateInputValue, dueStatus } from "./due-dates"

// Due dates are stored as Oslo midnight; "now" is a fixed instant
const osloMidnight = (day: string) => (day.startsWith("2026-11") || day.startsWith("2026-12") ? `${day}T00:00:00+01:00` : `${day}T00:00:00+02:00`)
const due = (day: string) => new Date(osloMidnight(day)).toISOString()
const now = new Date("2026-11-15T09:00:00+01:00") // Sunday morning in Oslo

describe("dueStatus", () => {
  it("knows overdue, today, tomorrow and later", () => {
    expect(dueStatus(due("2026-11-14"), now)).toEqual({ day: "2026-11-14", state: "overdue", label: "14. nov." })
    expect(dueStatus(due("2026-11-15"), now)).toEqual({ day: "2026-11-15", state: "today", label: "I dag" })
    expect(dueStatus(due("2026-11-16"), now)).toEqual({ day: "2026-11-16", state: "future", label: "I morgen" })
    expect(dueStatus(due("2026-12-24"), now)?.state).toBe("future")
    expect(dueStatus(null, now)).toBeNull()
  })

  it("uses Oslo days even just before midnight in another timezone", () => {
    // 23:30 Saturday in London is already Sunday 00:30 in Oslo
    const lateSaturdayInLondon = new Date("2026-11-14T23:30:00Z")
    expect(dueStatus(due("2026-11-15"), lateSaturdayInLondon)?.state).toBe("today")
  })

  it("gives the date input's value", () => {
    expect(dueDateInputValue(due("2026-11-20"))).toBe("2026-11-20")
    expect(dueDateInputValue(null)).toBe("")
  })
})

describe("byDueDate", () => {
  it("puts the earliest due date first and to-dos without one last, oldest first", () => {
    const todo = (title: string, dueDate: string | null, createdAt: string) => ({ title, dueDate, createdAt })
    const sorted = [
      todo("Ingen frist, ny", null, "2026-11-20T10:00:00Z"),
      todo("Neste uke", due("2026-11-22"), "2026-11-01T10:00:00Z"),
      todo("Ingen frist, gammel", null, "2026-11-01T10:00:00Z"),
      todo("Forfalt", due("2026-11-10"), "2026-11-15T10:00:00Z"),
      todo("I dag", due("2026-11-15"), "2026-11-02T10:00:00Z"),
    ].sort(byDueDate)
    expect(sorted.map((t) => t.title)).toEqual(["Forfalt", "I dag", "Neste uke", "Ingen frist, gammel", "Ingen frist, ny"])
  })
})
