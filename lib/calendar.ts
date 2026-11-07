import { prisma } from "@/lib/prisma"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns"

export async function getEventsForMonth(familyId: string, year: number, month: number) {
  const monthDate = new Date(year, month, 1)
  const rangeStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 })
  const rangeEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 })

  return prisma.calendarEvent.findMany({
    where: {
      familyId,
      startTime: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    include: {
      attendees: {
        include: { user: true },
      },
      createdBy: true,
    },
    orderBy: { startTime: "asc" },
  })
}

export async function getFamilyMembersForCalendar(familyId: string) {
  const members = await prisma.familyMember.findMany({
    where: { familyId },
    include: { user: true },
    orderBy: { joinedAt: "asc" },
  })
  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    image: m.user.image,
  }))
}
