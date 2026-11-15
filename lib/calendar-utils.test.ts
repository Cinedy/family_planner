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
    recurrenceExceptions: [],
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

// ─── Multi-day events, repeat end, skipped days ─────────────────────────────
import {
  dayKey,
  formValuesFromEvent,
  occurrenceTimeLabel,
  occurrencesByDay,
  occurrencesOnDay,
  repeatUntil,
  seriesValuesFromOccurrenceEdit,
  validateEventForm,
} from "./calendar-utils"

function fromForm(values: Parameters<typeof eventFieldsFromForm>[0], extra: Partial<SerializedEvent> = {}): SerializedEvent {
  return { ...event("2026-01-01T00:00:00", null), ...eventFieldsFromForm(values), ...extra }
}
const days = (map: Map<string, unknown[]>) => [...map.keys()].sort()

describe("events over several days", () => {
  it("shows an all-day trip on each of its days, and not the day after", () => {
    const trip = fromForm({ title: "Hytta", date: "2026-11-20", endDate: "2026-11-22", allDay: "true" })
    expect(days(occurrencesByDay([trip], at("2026-11-16T00:00:00"), at("2026-11-30T00:00:00")))).toEqual([
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ])
  })

  it("keeps all-day events to their days across the daylight-saving change", () => {
    const single = fromForm({ title: "Påskeaften", date: "2026-03-28", allDay: "true" })
    const spanning = fromForm({ title: "Påske", date: "2026-03-28", endDate: "2026-03-30", allDay: "true" })
    const range = [at("2026-03-26T00:00:00"), at("2026-04-02T00:00:00")] as const
    expect(days(occurrencesByDay([single], ...range))).toEqual(["2026-03-28"])
    expect(days(occurrencesByDay([spanning], ...range))).toEqual(["2026-03-28", "2026-03-29", "2026-03-30"])
  })

  it("shows a timed event past midnight on both days, with 'Fra' and 'Til'", () => {
    const party = fromForm({ title: "Fest", date: "2026-11-21", startTime: "20:00", endDate: "2026-11-22", endTime: "02:00" })
    const sat = occurrencesOnDay([party], at("2026-11-21T12:00:00"))
    const sun = occurrencesOnDay([party], at("2026-11-22T12:00:00"))
    expect(occurrenceTimeLabel(sat[0], at("2026-11-21T12:00:00"))).toBe("Fra 20:00")
    expect(occurrenceTimeLabel(sun[0], at("2026-11-22T12:00:00"))).toBe("Til 02:00")
    expect(occurrencesOnDay([party], at("2026-11-23T12:00:00"))).toEqual([])
  })

  it("labels a normal evening event with its times", () => {
    const practice = fromForm({ title: "Trening", date: "2026-11-18", startTime: "18:00", endTime: "19:30" })
    const day = at("2026-11-18T12:00:00")
    expect(occurrenceTimeLabel(occurrencesOnDay([practice], day)[0], day)).toBe("18:00–19:30")
  })
})

describe("repeats with an end date and skipped days", () => {
  const weekly = (extra: Partial<SerializedEvent> = {}) =>
    fromForm(
      {
        title: "Fotball",
        date: "2026-11-02",
        startTime: "17:00",
        repeats: "true",
        recurrenceType: "weekly",
        repeatUntil: "2026-11-23",
      },
      extra
    )

  it("stops after «Gjentas til» (inclusive)", () => {
    expect(weekly().recurrence).toBe("FREQ=WEEKLY;BYDAY=MO;UNTIL=20261123T235959Z")
    expect(days(occurrencesByDay([weekly()], at("2026-11-01T00:00:00"), at("2026-12-31T00:00:00")))).toEqual([
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
    ])
  })

  it("skips days that were moved or deleted", () => {
    const series = weekly({ recurrenceExceptions: ["2026-11-09"] })
    expect(days(occurrencesByDay([series], at("2026-11-01T00:00:00"), at("2026-12-31T00:00:00")))).toEqual([
      "2026-11-02",
      "2026-11-16",
      "2026-11-23",
    ])
  })

  it("reads the end date back for the form", () => {
    expect(repeatUntil(weekly().recurrence)).toBe("2026-11-23")
    expect(repeatUntil("FREQ=DAILY")).toBeUndefined()
  })
})

describe("form round trip", () => {
  it("gives back what was entered, for a multi-day timed event", () => {
    const values = {
      title: "Seminar",
      description: "",
      date: "2026-11-20",
      endDate: "2026-11-21",
      startTime: "09:00",
      endTime: "15:00",
      allDay: "false" as const,
      repeats: "false" as const,
      attendeeIds: [],
    }
    expect(formValuesFromEvent(fromForm(values))).toMatchObject(values)
  })

  it("opens a repeating event at the tapped occurrence", () => {
    const series = fromForm({ title: "Fotball", date: "2026-11-02", startTime: "17:00", repeats: "true", recurrenceType: "weekly" })
    const third = at("2026-11-16T17:00:00")
    expect(formValuesFromEvent(series, third)).toMatchObject({ date: "2026-11-16", startTime: "17:00" })
  })

  it("moves the whole series when its occurrence is moved", () => {
    const series = fromForm({ title: "Fotball", date: "2026-11-02", startTime: "17:00", repeats: "true", recurrenceType: "weekly" })
    const third = at("2026-11-16T17:00:00")
    const moved = { ...formValuesFromEvent(series, third), date: "2026-11-17" } // Monday → Tuesday
    const forSeries = seriesValuesFromOccurrenceEdit(moved, series, third)
    expect(forSeries.date).toBe("2026-11-03")
    expect(eventFieldsFromForm(forSeries).recurrence).toBe("FREQ=WEEKLY;BYDAY=TU")
  })

  it("catches impossible input", () => {
    expect(validateEventForm({ title: "x", date: "2026-11-20", startTime: "18:00", endTime: "17:00" })).toMatch(/Slutten/)
    expect(
      validateEventForm({ title: "x", date: "2026-11-20", repeats: "true", recurrenceType: "daily", repeatUntil: "2026-11-01" })
    ).toMatch(/Gjentas til/)
    expect(validateEventForm({ title: "x", date: "2026-11-20", startTime: "18:00", endTime: "19:00" })).toBeNull()
  })
})

describe("dayKey", () => {
  it("formats a calendar day", () => {
    expect(dayKey(at("2026-11-20T12:00:00"))).toBe("2026-11-20")
  })
})

describe("upcomingOccurrences", () => {
  it("leaves out events that are already over, but keeps ongoing ones", async () => {
    const { upcomingOccurrences } = await import("./calendar-utils")
    const morning = fromForm({ title: "Frokostmøte", date: "2026-11-15", startTime: "08:00", endTime: "09:00" })
    const trip = fromForm({ title: "Hytta", date: "2026-11-14", endDate: "2026-11-16", allDay: "true" })
    const evening = fromForm({ title: "Kino", date: "2026-11-15", startTime: "19:00", endTime: "21:00" })
    const now = at("2026-11-15T15:00:00")
    expect(upcomingOccurrences([morning, trip, evening], 3, 60, now).map((o) => o.event.title)).toEqual(["Hytta", "Kino"])
  })
})
