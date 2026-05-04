import { CalendarDays } from "lucide-react"

export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Kalender</h1>
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <CalendarDays className="h-12 w-12 mb-4 opacity-30" />
        <p className="font-medium">Familiekalender</p>
        <p className="text-sm mt-1">Kommer i fase 3</p>
      </div>
    </div>
  )
}
