"use client"

import { RotateCcw } from "lucide-react"
import { PersonAvatar } from "@/components/PersonAvatar"
import { occurrenceTimeLabel, type Occurrence } from "@/lib/calendar-utils"

interface EventRowProps {
  occurrence: Occurrence
  /** The day the row is shown under (for "Fra 20:00" / "Til 02:00" on multi-day events) */
  day: Date
  onClick: (occurrence: Occurrence) => void
}

export function EventRow({ occurrence, day, onClick }: EventRowProps) {
  const { event } = occurrence
  return (
    <button
      onClick={() => onClick(occurrence)}
      className="w-full text-left flex items-start gap-3 rounded-lg p-3 hover:bg-muted active:bg-muted/80 transition-colors min-h-[44px]"
    >
      <span
        className="mt-0.5 w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: event.color ?? "var(--primary)" }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{event.title}</span>
          {event.recurrence && <RotateCcw className="size-3 text-muted-foreground shrink-0" aria-label="Gjentas" />}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{occurrenceTimeLabel(occurrence, day)}</p>
      </div>
      {event.attendees.length > 0 && (
        <div className="flex -space-x-1.5 shrink-0">
          {event.attendees.slice(0, 3).map((a) => (
            <PersonAvatar key={a.userId} person={a.user} />
          ))}
          {event.attendees.length > 3 && (
            <span className="size-5 rounded-full bg-muted border border-background flex items-center justify-center text-[10px]">
              +{event.attendees.length - 3}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
