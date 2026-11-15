"use client"

import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { occurrencesOnDay, type Occurrence } from "@/lib/calendar-utils"
import { EventRow } from "./EventRow"
import type { SerializedEvent } from "@/types/calendar"

interface DayEventListProps {
  selectedDate: Date
  events: SerializedEvent[]
  onEventClick: (occurrence: Occurrence) => void
}

export function DayEventList({ selectedDate, events, onEventClick }: DayEventListProps) {
  const dayOccurrences = occurrencesOnDay(events, selectedDate)

  return (
    <>
      <div className="px-1 pt-4 pb-2">
        <h2 className="text-sm font-semibold capitalize text-muted-foreground">
          {format(selectedDate, "EEEE d. MMMM", { locale: nb })}
        </h2>
      </div>

      <div className="space-y-1">
        {dayOccurrences.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Ingen hendelser denne dagen</p>
        ) : (
          dayOccurrences.map((occ) => (
            <EventRow key={occ.key} occurrence={occ} day={selectedDate} onClick={onEventClick} />
          ))
        )}
      </div>
    </>
  )
}
