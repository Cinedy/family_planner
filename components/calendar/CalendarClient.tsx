"use client"

import { useRef, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { addMonths, startOfMonth, subMonths } from "date-fns"
import { Plus } from "lucide-react"
import { MonthGrid } from "./MonthGrid"
import { DayEventList } from "./DayEventList"
import { AgendaList } from "./AgendaList"
import { EventSheet } from "./EventSheet"
import { PersonAvatar } from "@/components/PersonAvatar"
import { db } from "@/lib/local/db"
import { useMeta } from "@/components/sync/SyncProvider"
import { cn } from "@/lib/utils"
import type { Occurrence } from "@/lib/calendar-utils"
import type { SerializedEvent } from "@/types/calendar"

type View = "month" | "list"

type SheetState = {
  key: number
  open: boolean
  event: SerializedEvent | null
  occurrenceStart: Date | null
  defaultDate: Date
}

export function CalendarClient() {
  const meta = useMeta()
  const events = useLiveQuery(() => db.events.toArray(), [], [])
  const familyMembers = useLiveQuery(() => db.members.toArray(), [], [])
  const [view, setView] = useState<View>("month")
  const [person, setPerson] = useState<string | null>(null)
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  // A new key per opening remounts the form with fresh values
  const openCount = useRef(0)
  const [sheet, setSheet] = useState<SheetState | null>(null)

  // Filter by person: their events, plus events without attendees (for everyone)
  const shown = person
    ? events.filter((e) => e.attendees.length === 0 || e.attendees.some((a) => a.userId === person))
    : events

  function openEvent(occurrence: Occurrence) {
    setSheet({
      key: ++openCount.current,
      open: true,
      event: occurrence.event,
      occurrenceStart: occurrence.event.recurrence ? occurrence.start : null,
      defaultDate: occurrence.start,
    })
  }

  function createEvent() {
    const date = view === "month" ? selectedDate : new Date()
    setSheet({ key: ++openCount.current, open: true, event: null, occurrenceStart: null, defaultDate: date })
  }

  const tabClass = (active: boolean) =>
    cn(
      "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
      active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
    )
  const chipClass = (active: boolean) =>
    cn(
      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors min-h-[36px]",
      active ? "border-primary bg-primary/10 text-primary font-medium" : "border-input bg-background text-muted-foreground"
    )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 p-1 bg-muted rounded-full">
          <button onClick={() => setView("month")} className={tabClass(view === "month")}>
            Måned
          </button>
          <button onClick={() => setView("list")} className={tabClass(view === "list")}>
            Liste
          </button>
        </div>
      </div>

      {familyMembers.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0" role="group" aria-label="Vis hendelser for">
          <button onClick={() => setPerson(null)} aria-pressed={person === null} className={chipClass(person === null)}>
            Alle
          </button>
          {familyMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => setPerson(person === m.id ? null : m.id)}
              aria-pressed={person === m.id}
              className={chipClass(person === m.id)}
            >
              <PersonAvatar person={m} />
              {m.name?.split(" ")[0] ?? "Ukjent"}
            </button>
          ))}
        </div>
      )}

      {view === "month" ? (
        <>
          <MonthGrid
            viewMonth={viewMonth}
            selectedDate={selectedDate}
            events={shown}
            onDayClick={setSelectedDate}
            onPrevMonth={() => setViewMonth((m) => startOfMonth(subMonths(m, 1)))}
            onNextMonth={() => setViewMonth((m) => startOfMonth(addMonths(m, 1)))}
          />
          <DayEventList selectedDate={selectedDate} events={shown} onEventClick={openEvent} />
        </>
      ) : (
        <AgendaList events={shown} onEventClick={openEvent} />
      )}

      <button
        onClick={createEvent}
        aria-label="Legg til hendelse"
        className="fixed bottom-above-tabbar right-4 z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="size-6" />
      </button>

      {sheet && (
        <EventSheet
          key={sheet.key}
          open={sheet.open}
          onOpenChange={(open) => setSheet({ ...sheet, open })}
          event={sheet.event}
          occurrenceStart={sheet.occurrenceStart}
          defaultDate={sheet.defaultDate}
          familyMembers={familyMembers}
          currentUserId={meta.me.id}
          isAdmin={meta.role === "admin"}
        />
      )}
    </div>
  )
}
