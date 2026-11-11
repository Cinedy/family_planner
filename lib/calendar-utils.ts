import { addDays, parseISO, startOfDay } from "date-fns"
import { fromZonedTime } from "date-fns-tz"
import { RRule } from "rrule"
import type { SerializedEvent } from "@/types/calendar"

export const TIMEZONE = "Europe/Oslo"
const DAY_NAMES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]

export type EventFormValues = {
  title: string
  description?: string
  date: string // yyyy-MM-dd
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  allDay?: "true" | "false"
  color?: string
  repeats?: "true" | "false"
  recurrenceType?: "daily" | "weekly" | "monthly" | "yearly"
  attendeeIds?: string[]
}

function toUTC(date: string, time: string | undefined, allDay: boolean): Date {
  if (allDay || !time) return fromZonedTime(`${date}T00:00:00`, TIMEZONE)
  return fromZonedTime(`${date}T${time}:00`, TIMEZONE)
}

function buildRRule(type: NonNullable<EventFormValues["recurrenceType"]>, date: string): string {
  if (type === "weekly") return `FREQ=WEEKLY;BYDAY=${DAY_NAMES[parseISO(date).getDay()]}`
  return `FREQ=${type.toUpperCase()}`
}

/** Turns form input (Oslo wall-clock time) into the stored event fields. */
export function eventFieldsFromForm(values: EventFormValues) {
  const allDay = values.allDay === "true"
  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    startTime: toUTC(values.date, values.startTime, allDay).toISOString(),
    endTime: values.endTime && !allDay ? toUTC(values.date, values.endTime, false).toISOString() : null,
    allDay,
    color: values.color ?? null,
    recurrence:
      values.repeats === "true" && values.recurrenceType ? buildRRule(values.recurrenceType, values.date) : null,
  }
}

function ruleFor(event: SerializedEvent): RRule | null {
  if (!event.recurrence) return null
  try {
    const options = RRule.parseString(event.recurrence.replace(/^RRULE:/, ""))
    return new RRule({ ...options, dtstart: new Date(event.startTime) })
  } catch {
    return null
  }
}

/** Start times of the event (including repeats) that fall within [from, to]. */
export function occurrencesBetween(event: SerializedEvent, from: Date, to: Date): Date[] {
  const rule = ruleFor(event)
  if (!rule) {
    const start = new Date(event.startTime)
    return start >= from && start <= to ? [start] : []
  }
  return rule.between(from, to, true)
}

/** The next `limit` occurrences from the start of today, across all events, within `days` days. */
export function upcomingOccurrences(events: SerializedEvent[], limit: number, days = 60) {
  const from = startOfDay(new Date())
  const to = addDays(from, days)
  return events
    .flatMap((event) => occurrencesBetween(event, from, to).map((start) => ({ event, start })))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limit)
}
