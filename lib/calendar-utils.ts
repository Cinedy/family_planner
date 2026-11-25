import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns"
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz"
import { RRule } from "rrule"
import type { SerializedEvent } from "@/types/calendar"

export const TIMEZONE = "Europe/Oslo"
const DAY_NAMES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
const DAY_MS = 24 * 60 * 60 * 1000

// ─── Form ⇄ stored event ───────────────────────────────────────────────────

export type EventFormValues = {
  title: string
  description?: string
  date: string // yyyy-MM-dd, first day
  endDate?: string // yyyy-MM-dd, last day when the event spans several days
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  allDay?: "true" | "false"
  color?: string
  repeats?: "true" | "false"
  recurrenceType?: "daily" | "weekly" | "monthly" | "yearly"
  repeatInterval?: string // "5" = every 5th day/week/month/year; empty or "1" = every
  repeatUntil?: string // yyyy-MM-dd, last day a repeat may start
  attendeeIds?: string[]
}

function toUTC(date: string, time: string | undefined): Date {
  return fromZonedTime(`${date}T${time || "00:00"}:00`, TIMEZONE)
}

function buildRRule(values: EventFormValues): string | null {
  if (values.repeats !== "true" || !values.recurrenceType) return null
  const type = values.recurrenceType
  let rule = type === "weekly" ? `FREQ=WEEKLY;BYDAY=${DAY_NAMES[parseISO(values.date).getDay()]}` : `FREQ=${type.toUpperCase()}`
  const interval = Number(values.repeatInterval)
  if (Number.isInteger(interval) && interval > 1) rule += `;INTERVAL=${interval}`
  // UNTIL is in the same "floating" Oslo time as the rest of the rule (see below)
  if (values.repeatUntil) rule += `;UNTIL=${values.repeatUntil.replaceAll("-", "")}T235959Z`
  return rule
}

const lastDay = (values: EventFormValues) =>
  values.endDate && values.endDate > values.date ? values.endDate : values.date

/** Turns form input (Oslo wall-clock time) into the stored event fields. */
export function eventFieldsFromForm(values: EventFormValues) {
  const allDay = values.allDay === "true"
  const end = lastDay(values)
  let endTime: string | null = null
  if (allDay) {
    // All-day: the end is midnight at the start of the last day (inclusive)
    if (end > values.date) endTime = toUTC(end, undefined).toISOString()
  } else if (values.endTime) {
    endTime = toUTC(end, values.endTime).toISOString()
  } else if (end > values.date) {
    endTime = toUTC(end, "23:59").toISOString()
  }
  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    startTime: toUTC(values.date, allDay ? undefined : values.startTime).toISOString(),
    endTime,
    allDay,
    color: values.color ?? null,
    recurrence: buildRRule(values),
  }
}

/** A message to show in the form, or null when the values make sense. */
export function validateEventForm(values: EventFormValues): string | null {
  const fields = eventFieldsFromForm(values)
  if (fields.endTime && fields.endTime < fields.startTime) return "Slutten kan ikke være før starten."
  if (values.repeats === "true" && values.repeatInterval && !/^[1-9]\d?$/.test(values.repeatInterval)) {
    return "Gjentakelsen må være et helt tall fra 1 til 99."
  }
  if (values.repeats === "true" && values.repeatUntil && values.repeatUntil < values.date) {
    return "«Gjentas til» må være etter startdatoen."
  }
  return null
}

export function repeatUntil(recurrence: string | null): string | undefined {
  const m = recurrence?.match(/UNTIL=(\d{4})(\d{2})(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined
}

/** Form values for editing an event — at a given occurrence when it repeats. */
export function formValuesFromEvent(event: SerializedEvent, occurrenceStart?: Date): EventFormValues {
  const start = occurrenceStart ?? new Date(event.startTime)
  const end = occurrenceEnd(event, start)
  const zStart = toZonedTime(start, TIMEZONE)
  const date = format(zStart, "yyyy-MM-dd")
  let endDate: string | undefined
  let endTime: string | undefined
  if (event.allDay) {
    const span = allDaySpan(event)
    if (span > 1) endDate = format(addDays(parseISO(date), span - 1), "yyyy-MM-dd")
  } else if (event.endTime) {
    const zEnd = toZonedTime(end, TIMEZONE)
    endTime = format(zEnd, "HH:mm")
    const d = format(zEnd, "yyyy-MM-dd")
    if (d !== date) endDate = d
  }
  return {
    title: event.title,
    description: event.description ?? "",
    date,
    endDate,
    startTime: event.allDay ? undefined : format(zStart, "HH:mm"),
    endTime,
    allDay: event.allDay ? "true" : "false",
    color: event.color ?? undefined,
    repeats: event.recurrence ? "true" : "false",
    recurrenceType: event.recurrence
      ? (event.recurrence.match(/FREQ=(\w+)/)?.[1]?.toLowerCase() as EventFormValues["recurrenceType"])
      : undefined,
    repeatInterval: event.recurrence?.match(/INTERVAL=(\d+)/)?.[1] ?? "1",
    repeatUntil: repeatUntil(event.recurrence),
    attendeeIds: event.attendees.map((a) => a.userId),
  }
}

/**
 * Editing "the whole series" from one occurrence: moving that occurrence by N days
 * moves the series start by N days too.
 */
export function seriesValuesFromOccurrenceEdit(
  values: EventFormValues,
  event: SerializedEvent,
  occurrenceStart: Date
): EventFormValues {
  const shift = differenceInCalendarDays(parseISO(values.date), parseISO(dayKey(occurrenceStart)))
  const seriesStart = parseISO(format(toZonedTime(new Date(event.startTime), TIMEZONE), "yyyy-MM-dd"))
  const date = format(addDays(seriesStart, shift), "yyyy-MM-dd")
  const endDate = values.endDate
    ? format(addDays(parseISO(date), differenceInCalendarDays(parseISO(values.endDate), parseISO(values.date))), "yyyy-MM-dd")
    : undefined
  return { ...values, date, endDate }
}

// ─── Occurrences ───────────────────────────────────────────────────────────

/** One appearance of an event; a repeating event has many. */
export type Occurrence = {
  event: SerializedEvent
  start: Date
  end: Date
  /** Stable React key */
  key: string
}

/** Calendar-day key used for grouping and for skipped days of a series. */
export const dayKey = (date: Date) => format(date, "yyyy-MM-dd")

/** The calendar day in Oslo, whatever timezone the phone is set to. */
export const osloDayKey = (date: Date) => formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd")

/** Number of days an all-day event covers (1 for a single day). */
function allDaySpan(event: SerializedEvent): number {
  if (!event.endTime) return 1
  return Math.max(1, differenceInCalendarDays(new Date(event.endTime), new Date(event.startTime)) + 1)
}

/** When an occurrence starting at `start` ends. */
function occurrenceEnd(event: SerializedEvent, start: Date): Date {
  if (event.allDay) return addDays(startOfDay(start), allDaySpan(event)) // counted in days, so DST-safe
  const duration = event.endTime ? Date.parse(event.endTime) - Date.parse(event.startTime) : 0
  return new Date(start.getTime() + Math.max(0, duration))
}

// rrule works in UTC. To keep repeats on the right Oslo wall-clock time across
// daylight saving changes, we feed it "floating" dates whose UTC fields hold the
// Oslo wall-clock time, and convert the results back.
function toFloating(date: Date): Date {
  const z = toZonedTime(date, TIMEZONE)
  return new Date(Date.UTC(z.getFullYear(), z.getMonth(), z.getDate(), z.getHours(), z.getMinutes(), z.getSeconds()))
}

function fromFloating(f: Date): Date {
  const wall = new Date(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate(), f.getUTCHours(), f.getUTCMinutes(), f.getUTCSeconds())
  return fromZonedTime(wall, TIMEZONE)
}

function ruleFor(event: SerializedEvent): RRule | null {
  if (!event.recurrence) return null
  try {
    const options = RRule.parseString(event.recurrence.replace(/^RRULE:/, ""))
    // The rule must start at the event's own start, otherwise rrule assumes "now"
    return new RRule({ ...options, dtstart: toFloating(new Date(event.startTime)) })
  } catch {
    return null
  }
}

/** Start times of the event (including repeats, minus skipped days) within [from, to]. */
export function occurrencesBetween(event: SerializedEvent, from: Date, to: Date): Date[] {
  const rule = ruleFor(event)
  if (!rule) {
    const start = new Date(event.startTime)
    return start >= from && start <= to ? [start] : []
  }
  const skipped = new Set(event.recurrenceExceptions ?? [])
  return rule
    .between(toFloating(from), toFloating(to), true)
    .map(fromFloating)
    .filter((start) => !skipped.has(dayKey(start)))
}

/** Occurrences that overlap [from, to) — including ones that started earlier and are still going. */
function occurrences(event: SerializedEvent, from: Date, to: Date): Occurrence[] {
  // Look back far enough to catch a multi-day occurrence that started before `from`
  const lookBack = event.allDay ? allDaySpan(event) * DAY_MS + DAY_MS : occurrenceEnd(event, from).getTime() - from.getTime()
  return occurrencesBetween(event, new Date(from.getTime() - lookBack), to)
    .map((start) => ({ event, start, end: occurrenceEnd(event, start), key: `${event.id}:${start.getTime()}` }))
    .filter((o) => o.start < to && (o.end > from || (o.end.getTime() === o.start.getTime() && o.start >= from)))
}

const byTime = (a: Occurrence, b: Occurrence) => {
  if (a.event.allDay !== b.event.allDay) return a.event.allDay ? -1 : 1
  return a.start.getTime() - b.start.getTime() || a.event.title.localeCompare(b.event.title, "nb")
}

/** Everything happening on a calendar day: all-day first, then by start time. */
export function occurrencesOnDay(events: SerializedEvent[], day: Date): Occurrence[] {
  const from = startOfDay(day)
  const to = addDays(from, 1)
  return events.flatMap((e) => occurrences(e, from, to)).sort(byTime)
}

export function occursOnDay(event: SerializedEvent, day: Date): boolean {
  return occurrencesOnDay([event], day).length > 0
}

/** Occurrences per day key from `from` (inclusive) to `to` (exclusive); multi-day ones appear on each day. */
export function occurrencesByDay(events: SerializedEvent[], from: Date, to: Date): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>()
  for (const occ of events.flatMap((e) => occurrences(e, from, to))) {
    let day = startOfDay(occ.start < from ? from : occ.start)
    // A timed event ending exactly at midnight doesn't count the next day
    while (day < to && (day < occ.end || day.getTime() === occ.start.getTime())) {
      const key = dayKey(day)
      map.set(key, [...(map.get(key) ?? []), occ])
      day = addDays(day, 1)
    }
  }
  for (const list of map.values()) list.sort(byTime)
  return map
}

/** The next `limit` occurrences that haven't finished yet (ongoing ones included), within `days` days. */
export function upcomingOccurrences(events: SerializedEvent[], limit: number, days = 60, now = new Date()) {
  const from = startOfDay(now)
  const to = addDays(from, days)
  const finished = (o: Occurrence) => (o.end > o.start ? o.end : o.start) <= now
  return events
    .flatMap((event) => occurrences(event, from, to))
    .filter((o) => !finished(o))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limit)
}

/** Short time label for an occurrence shown on `day`, e.g. "18:00–19:30", "Hele dagen", "Fra 14:00". */
export function occurrenceTimeLabel(occ: Occurrence, day: Date): string {
  const time = (d: Date) => format(toZonedTime(d, TIMEZONE), "HH:mm")
  if (occ.event.allDay) return "Hele dagen"
  const startsToday = dayKey(occ.start) === dayKey(day)
  const lastMoment = new Date(occ.end.getTime() - 1)
  const endsToday = occ.end.getTime() === occ.start.getTime() || dayKey(lastMoment) === dayKey(day)
  if (startsToday && endsToday) {
    return occ.end.getTime() > occ.start.getTime() ? `${time(occ.start)}–${time(occ.end)}` : time(occ.start)
  }
  if (startsToday) return `Fra ${time(occ.start)}`
  if (endsToday) return `Til ${time(occ.end)}`
  return "Hele dagen"
}
