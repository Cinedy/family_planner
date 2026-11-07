import { toZonedTime } from "date-fns-tz"
import { startOfISOWeek, startOfDay, format, getISODay } from "date-fns"
import { prisma } from "@/lib/prisma"

export async function getDashboardData(familyId: string) {
  const now = toZonedTime(new Date(), "Europe/Oslo")
  const todayIndex = getISODay(now) - 1 // 0=Mon, 6=Sun
  const mondayOslo = startOfISOWeek(now)
  const weekStart = new Date(format(mondayOslo, "yyyy-MM-dd") + "T00:00:00.000Z")
  const todayStart = startOfDay(now)

  const [plan, upcomingEvents, pendingTodos, groceryCount] = await Promise.all([
    prisma.mealPlan.findUnique({
      where: { familyId_weekStart: { familyId, weekStart } },
      include: { entries: { where: { day: todayIndex, mealType: "dinner" } } },
    }),
    prisma.calendarEvent.findMany({
      where: { familyId, startTime: { gte: todayStart } },
      orderBy: { startTime: "asc" },
      take: 3,
    }),
    prisma.todoItem.findMany({
      where: { list: { familyId }, completed: false },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 5,
    }),
    prisma.groceryItem.count({
      where: { list: { familyId }, checked: false },
    }),
  ])

  return {
    todayDinner: plan?.entries[0] ?? null,
    upcomingEvents,
    pendingTodos,
    groceryCount,
  }
}
