"use client"

import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { addMonths, subMonths, startOfMonth } from "date-fns"
import { MonthGrid } from "./MonthGrid"
import { DayEventList } from "./DayEventList"
import { EventSheet } from "./EventSheet"
import { db } from "@/lib/local/db"
import { useMeta } from "@/components/sync/SyncProvider"
import type { SerializedEvent } from "@/types/calendar"

export function CalendarClient() {
  const meta = useMeta()
  const events = useLiveQuery(() => db.events.toArray(), [], [])
  const familyMembers = useLiveQuery(() => db.members.toArray(), [], [])
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SerializedEvent | null>(null)
  const [createDate, setCreateDate] = useState<Date>(new Date())

  function navigateMonth(direction: "prev" | "next") {
    const newMonth = direction === "prev" ? subMonths(viewMonth, 1) : addMonths(viewMonth, 1)
    setViewMonth(startOfMonth(newMonth))
  }

  function handleDayClick(day: Date) {
    setSelectedDate(day)
  }

  function handleEventClick(event: SerializedEvent) {
    setEditingEvent(event)
    setSheetOpen(true)
  }

  function handleCreateEvent(date: Date) {
    setCreateDate(date)
    setEditingEvent(null)
    setSheetOpen(true)
  }

  function handleSheetClose(open: boolean) {
    setSheetOpen(open)
    if (!open) setEditingEvent(null)
  }

  return (
    <div className="space-y-1">
      <MonthGrid
        viewMonth={viewMonth}
        selectedDate={selectedDate}
        events={events}
        onDayClick={handleDayClick}
        onPrevMonth={() => navigateMonth("prev")}
        onNextMonth={() => navigateMonth("next")}
      />
      <DayEventList
        selectedDate={selectedDate}
        events={events}
        onEventClick={handleEventClick}
        onCreateEvent={handleCreateEvent}
      />
      <EventSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        event={editingEvent}
        defaultDate={createDate}
        familyMembers={familyMembers}
        currentUserId={meta.me.id}
        isAdmin={meta.role === "admin"}
      />
    </div>
  )
}
