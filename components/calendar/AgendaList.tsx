"use client"

import { useState } from "react"
import { addDays, format, isToday, isTomorrow, startOfDay } from "date-fns"
import { nb } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { occurrencesByDay, type Occurrence } from "@/lib/calendar-utils"
import { EventRow } from "./EventRow"
import type { SerializedEvent } from "@/types/calendar"

const STEP_DAYS = 30

function dayHeading(day: Date) {
  if (isToday(day)) return "I dag"
  if (isTomorrow(day)) return "I morgen"
  return format(day, "EEEE d. MMMM", { locale: nb })
}

interface AgendaListProps {
  events: SerializedEvent[]
  onEventClick: (occurrence: Occurrence) => void
}

/** Upcoming events grouped by day, starting today. */
export function AgendaList({ events, onEventClick }: AgendaListProps) {
  const [days, setDays] = useState(STEP_DAYS)
  const today = startOfDay(new Date())
  const byDay = occurrencesByDay(events, today, addDays(today, days))
  const dayKeys = [...byDay.keys()].sort()

  return (
    <div className="space-y-4 pt-2">
      {dayKeys.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">Ingen hendelser de neste {days} dagene</p>
      )}
      {dayKeys.map((key) => {
        const day = new Date(`${key}T00:00:00`)
        return (
          <section key={key} aria-label={dayHeading(day)}>
            <h2 className="px-1 pb-1 text-sm font-semibold capitalize text-muted-foreground">{dayHeading(day)}</h2>
            <div className="space-y-1">
              {byDay.get(key)!.map((occ) => (
                <EventRow key={occ.key} occurrence={occ} day={day} onClick={onEventClick} />
              ))}
            </div>
          </section>
        )
      })}
      <Button variant="outline" className="w-full min-h-[44px]" onClick={() => setDays((d) => d + STEP_DAYS)}>
        Vis flere dager
      </Button>
    </div>
  )
}
