"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addMonths, subMonths, startOfMonth } from "date-fns"
import { MonthGrid } from "./MonthGrid"
import { DayEventList } from "./DayEventList"
import { EventSheet } from "./EventSheet"
import type { SerializedEvent, FamilyMemberForCalendar } from "@/types/calendar"

interface CalendarClientProps {
  initialEvents: SerializedEvent[]
  familyMembers: FamilyMemberForCalendar[]
  currentUserId: string
  initialYear: number
  initialMonth: number
}

export function CalendarClient({
  initialEvents,
  familyMembers,
  currentUserId,
  initialYear,
  initialMonth,
}: CalendarClientProps) {
  const router = useRouter()
  const [viewMonth, setViewMonth] = useState(new Date(initialYear, initialMonth, 1))
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SerializedEvent | null>(null)
  const [createDate, setCreateDate] = useState<Date>(new Date())

  function navigateMonth(direction: "prev" | "next") {
    const newMonth = direction === "prev" ? subMonths(viewMonth, 1) : addMonths(viewMonth, 1)
    setViewMonth(startOfMonth(newMonth))
    const y = newMonth.getFullYear()
    const m = newMonth.getMonth()
    router.replace(`/calendar?year=${y}&month=${m}`, { scroll: false })
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
        events={initialEvents}
        onDayClick={handleDayClick}
        onPrevMonth={() => navigateMonth("prev")}
        onNextMonth={() => navigateMonth("next")}
      />
      <DayEventList
        selectedDate={selectedDate}
        events={initialEvents}
        onEventClick={handleEventClick}
        onCreateEvent={handleCreateEvent}
      />
      <EventSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        event={editingEvent}
        defaultDate={createDate}
        familyMembers={familyMembers}
        currentUserId={currentUserId}
      />
    </div>
  )
}
