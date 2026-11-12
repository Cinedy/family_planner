import { describe, expect, it } from "vitest"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import { eventFieldsFromForm, occurrencesBetween, occursOnDay, TIMEZONE } from "./calendar-utils"
import type { SerializedEvent } from "@/types/calendar"

const oslo = (d: Date) => formatInTimeZone(d, TIMEZONE, "EEE yyyy-MM-dd HH:mm")
const at = (wallClock: string) => fromZonedTime(wallClock, TIMEZONE)

function event(start: string, recurrence: string | null): SerializedEvent {
  return {
    id: "e1",
    title: "Test",
    description: null,
    startTime: at(start).toISOString(),
    endTime: null,
    allDay: false,
    color: null,
    recurrence,
    createdById: "u1",
    familyId: "f1",
    attendees: [],
    createdBy: { id: "u1", name: null, image: null },
  }
}

describe("eventFieldsFromForm", () => {
  it("stores Oslo wall-clock times as UTC (winter and summer)", () => {
    expect(eventFieldsFromForm({ title: "A", date: "2026-01-15", startTime: "18:00" }).startTime).toBe(
      "2026-01-15T17:00:00.000Z"
    )
    expect(eventFieldsFromForm({ title: "A", date: "2026-07-15", startTime: "18:00" }).startTime).toBe(
      "2026-07-15T16:00:00.000Z"
    )
  })

  it("drops the end time for all-day events", () => {
    const fields = eventFieldsFromForm({ title: "A", date: "2026-01-15", allDay: "true", endTime: "20:00" })
    expect(fields.allDay).toBe(true)
    expect(fields.endTime).toBeNull()
  })

  it("uses the Oslo weekday for weekly repeats, even just after midnight", () => {
    const fields = eventFieldsFromForm({
      title: "A",
      date: "2026-03-02", // a Monday
      startTime: "00:30",
      repeats: "true",
      recurrenceType: "weekly",
    })
    expect(fields.recurrence).toBe("FREQ=WEEKLY;BYDAY=MO")
  })

  it("has no recurrence unless repeats is on", () => {
    expect(eventFieldsFromForm({ title: "A", date: "2026-03-02", recurrenceType: "daily" }).recurrence).toBeNull()
  })
})

describe("occurrencesBetween", () => {
  it("repeats monthly on the event's own day, not today's", () => {
    const e = event("2026-01-15T18:00:00", "FREQ=MONTHLY")
    expect(occurrencesBetween(e, at("2026-01-01T00:00:00"), at("2026-05-01T00:00:00")).map(oslo)).toEqual([
      "Thu 2026-01-15 18:00",
      "Sun 2026-02-15 18:00",
      "Sun 2026-03-15 18:00",
      "Wed 2026-04-15 18:00",
    ])
  })

  it("keeps the wall-clock time across the daylight-saving change", () => {
    const e = event("2026-03-23T00:30:00", "FREQ=WEEKLY;BYDAY=MO")
    expect(occurrencesBetween(e, at("2026-03-22T00:00:00"), at("2026-04-07T00:00:00")).map(oslo)).toEqual([
      "Mon 2026-03-23 00:30",
      "Mon 2026-03-30 00:30",
      "Mon 2026-04-06 00:30",
    ])
  })

  it("never shows a repeat before the event starts", () => {
    const e = event("2026-06-01T09:00:00", "FREQ=DAILY")
    expect(occurrencesBetween(e, at("2026-05-01T00:00:00"), at("2026-05-31T23:59:00"))).toEqual([])
  })

  it("handles one-off events", () => {
    const e = event("2026-06-01T09:00:00", null)
    expect(occursOnDay(e, at("2026-06-01T12:00:00"))).toBe(true)
    expect(occursOnDay(e, at("2026-06-02T12:00:00"))).toBe(false)
  })

  it("treats a broken rule as a one-off event instead of crashing", () => {
    const e = event("2026-06-01T09:00:00", "FREQ=NONSENSE")
    expect(occurrencesBetween(e, at("2026-05-01T00:00:00"), at("2026-07-01T00:00:00"))).toHaveLength(1)
  })
})
