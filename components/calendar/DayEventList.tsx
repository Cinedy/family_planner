"use client"

import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import { Plus, RotateCcw } from "lucide-react"
import { TIMEZONE, occursOnDay } from "@/lib/calendar-utils"
import type { SerializedEvent } from "@/types/calendar"

function getEventsForDay(events: SerializedEvent[], day: Date): SerializedEvent[] {
  return events
    .filter((event) => occursOnDay(event, day))
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return -1
      if (!a.allDay && b.allDay) return 1
      // Compare time of day, so repeats sort by their time rather than first date
      return toZonedTime(new Date(a.startTime), TIMEZONE).toTimeString().localeCompare(
        toZonedTime(new Date(b.startTime), TIMEZONE).toTimeString()
      )
    })
}

function formatEventTime(event: SerializedEvent): string {
  if (event.allDay) return "Hele dagen"
  const start = toZonedTime(new Date(event.startTime), TIMEZONE)
  const startStr = format(start, "HH:mm")
  if (!event.endTime) return startStr
  const end = toZonedTime(new Date(event.endTime), TIMEZONE)
  return `${startStr}–${format(end, "HH:mm")}`
}

interface DayEventListProps {
  selectedDate: Date
  events: SerializedEvent[]
  onEventClick: (event: SerializedEvent) => void
  onCreateEvent: (date: Date) => void
}

export function DayEventList({ selectedDate, events, onEventClick, onCreateEvent }: DayEventListProps) {
  const dayEvents = getEventsForDay(events, selectedDate)

  return (
    <>
      {/* Day header */}
      <div className="px-1 pt-4 pb-2">
        <h2 className="text-sm font-semibold capitalize text-muted-foreground">
          {format(selectedDate, "EEEE d. MMMM", { locale: nb })}
        </h2>
      </div>

      {/* Event list */}
      <div className="space-y-1">
        {dayEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Ingen hendelser denne dagen
          </p>
        ) : (
          dayEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEventClick(event)}
              className="w-full text-left flex items-start gap-3 rounded-lg p-3 hover:bg-muted active:bg-muted/80 transition-colors min-h-[44px]"
            >
              {/* Color bar */}
              <span
                className="mt-0.5 w-1 self-stretch rounded-full shrink-0"
                style={{ backgroundColor: event.color ?? "var(--primary)" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{event.title}</span>
                  {event.recurrence && (
                    <RotateCcw className="size-3 text-muted-foreground shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{formatEventTime(event)}</p>
              </div>
              {/* Attendee avatars */}
              {event.attendees.length > 0 && (
                <div className="flex -space-x-1.5 shrink-0">
                  {event.attendees.slice(0, 3).map((a) => (
                    <span
                      key={a.userId}
                      className="size-5 rounded-full bg-muted border border-background flex items-center justify-center text-[10px] font-medium overflow-hidden"
                    >
                      {a.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.user.image} alt={a.user.name ?? ""} className="size-full object-cover" />
                      ) : (
                        (a.user.name?.[0] ?? "?").toUpperCase()
                      )}
                    </span>
                  ))}
                  {event.attendees.length > 3 && (
                    <span className="size-5 rounded-full bg-muted border border-background flex items-center justify-center text-[10px]">
                      +{event.attendees.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => onCreateEvent(selectedDate)}
        aria-label="Legg til hendelse"
        className="fixed bottom-above-tabbar right-4 z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform md:bottom-6"
      >
        <Plus className="size-6" />
      </button>
    </>
  )
}
