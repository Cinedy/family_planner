import { CalendarClient } from "@/components/calendar/CalendarClient"

export default function CalendarPage() {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold pb-2">Kalender</h1>
      <CalendarClient />
    </div>
  )
}
