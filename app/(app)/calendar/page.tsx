import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getFamilyForUser } from "@/lib/family"
import { getEventsForMonth, getFamilyMembersForCalendar } from "@/lib/calendar"
import { CalendarClient } from "@/components/calendar/CalendarClient"
import type { SerializedEvent } from "@/types/calendar"

interface CalendarPageProps {
  searchParams: Promise<{ year?: string; month?: string }>
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) redirect("/onboarding")

  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear()
  const month = params.month !== undefined ? parseInt(params.month, 10) : now.getMonth()

  const [rawEvents, members] = await Promise.all([
    getEventsForMonth(membership.familyId, year, month),
    getFamilyMembersForCalendar(membership.familyId),
  ])

  const events: SerializedEvent[] = rawEvents.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime?.toISOString() ?? null,
    allDay: e.allDay,
    color: e.color,
    recurrence: e.recurrence,
    createdById: e.createdById,
    familyId: e.familyId,
    attendees: e.attendees.map((a) => ({
      userId: a.userId,
      user: {
        id: a.user.id,
        name: a.user.name,
        image: a.user.image,
      },
    })),
    createdBy: {
      id: e.createdBy.id,
      name: e.createdBy.name,
      image: e.createdBy.image,
    },
  }))

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold pb-2">Kalender</h1>
      <CalendarClient
        initialEvents={events}
        familyMembers={members}
        currentUserId={session.user.id}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  )
}
