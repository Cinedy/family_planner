"use client"

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  endOfDay,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from "date-fns"
import { nb } from "date-fns/locale"
import { occurrencesBetween } from "@/lib/calendar-utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SerializedEvent } from "@/types/calendar"

const WEEKDAY_LABELS = ["Ma", "Ti", "On", "To", "Fr", "Lø", "Sø"]

interface MonthGridProps {
  viewMonth: Date
  selectedDate: Date
  events: SerializedEvent[]
  onDayClick: (day: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

function buildEventMap(
  events: SerializedEvent[],
  rangeStart: Date,
  rangeEnd: Date
): Map<string, SerializedEvent[]> {
  const map = new Map<string, SerializedEvent[]>()

  function addToMap(key: string, event: SerializedEvent) {
    const existing = map.get(key) ?? []
    map.set(key, [...existing, event])
  }

  for (const event of events) {
    for (const start of occurrencesBetween(event, rangeStart, rangeEnd)) {
      addToMap(format(start, "yyyy-MM-dd"), event)
    }
  }

  return map
}

export function MonthGrid({
  viewMonth,
  selectedDate,
  events,
  onDayClick,
  onPrevMonth,
  onNextMonth,
}: MonthGridProps) {
  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const eventMap = buildEventMap(events, gridStart, endOfDay(gridEnd))

  return (
    <div className="select-none">
      {/* Month navigation header */}
      <div className="flex items-center justify-between px-1 py-2">
        <button
          onClick={onPrevMonth}
          aria-label="Forrige måned"
          className="size-9 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-base font-semibold capitalize">
          {format(viewMonth, "MMMM yyyy", { locale: nb })}
        </span>
        <button
          onClick={onNextMonth}
          aria-label="Neste måned"
          className="size-9 flex items-center justify-center rounded-full hover:bg-muted active:bg-muted/80 transition-colors"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd")
          const dayEvents = eventMap.get(key) ?? []
          const isCurrentMonth = isSameMonth(day, viewMonth)
          const isSelected = isSameDay(day, selectedDate)
          const isTodayDay = isToday(day)
          const displayDots = dayEvents.slice(0, 3)
          const extraCount = dayEvents.length - displayDots.length

          return (
            <button
              key={key}
              onClick={() => onDayClick(day)}
              className={cn(
                "bg-background flex flex-col items-center justify-start pt-1 pb-1.5 min-h-[44px] transition-colors",
                !isCurrentMonth && "opacity-30",
                isSelected && "bg-primary/10"
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm leading-none",
                  isTodayDay && !isSelected && "font-bold text-primary",
                  isSelected && "bg-primary text-primary-foreground font-bold"
                )}
              >
                {format(day, "d")}
              </span>
              {/* Event dots */}
              <div className="flex items-center gap-px mt-0.5 h-2">
                {displayDots.map((event, i) => (
                  <span
                    key={i}
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: event.color ?? "var(--primary)" }}
                  />
                ))}
                {extraCount > 0 && (
                  <span className="text-[9px] leading-none text-muted-foreground ml-px">
                    +{extraCount}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
