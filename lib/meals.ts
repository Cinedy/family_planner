import { prisma } from "@/lib/prisma"

export async function getWeekPlan(familyId: string, weekStartDate: Date) {
  return prisma.mealPlan.findUnique({
    where: {
      familyId_weekStart: { familyId, weekStart: weekStartDate },
    },
    include: {
      entries: {
        where: { mealType: "dinner" },
        orderBy: { day: "asc" },
      },
    },
  })
}

export async function getRecipesForFamily(familyId: string) {
  return prisma.recipe.findMany({
    where: { familyId },
    orderBy: { title: "asc" },
  })
}
