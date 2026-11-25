import { addDays } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { nb } from "date-fns/locale"
import { osloDayKey, TIMEZONE } from "@/lib/calendar-utils"

// To-do due dates are stored as midnight in Oslo; everything here works in Oslo days.

export type DueStatus = {
  /** Oslo day, "yyyy-MM-dd" — sorts chronologically */
  day: string
  state: "overdue" | "today" | "future"
  /** "I dag", "I morgen" or "12. nov" */
  label: string
}

export function dueStatus(dueDate: string | null, now = new Date()): DueStatus | null {
  if (!dueDate) return null
  const due = new Date(dueDate)
  const day = osloDayKey(due)
  const today = osloDayKey(now)
  if (day === today) return { day, state: "today", label: "I dag" }
  if (day === osloDayKey(addDays(now, 1))) return { day, state: "future", label: "I morgen" }
  return {
    day,
    state: day < today ? "overdue" : "future",
    label: formatInTimeZone(due, TIMEZONE, "d. MMM", { locale: nb }),
  }
}

/** To-do list order: earliest due date first (overdue on top), then no due date; ties by when added. */
export const byDueDate = (
  a: { dueDate: string | null; createdAt: string },
  b: { dueDate: string | null; createdAt: string }
) => {
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate) // ISO strings sort chronologically
  }
  return a.createdAt.localeCompare(b.createdAt)
}

/** Stored due date → the date input's "yyyy-MM-dd" (Oslo), or "" for none. */
export const dueDateInputValue = (dueDate: string | null) => (dueDate ? osloDayKey(new Date(dueDate)) : "")
