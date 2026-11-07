import { redirect } from "next/navigation"
import { toZonedTime } from "date-fns-tz"
import { startOfISOWeek, format, parseISO, isValid } from "date-fns"
import { auth } from "@/auth"
import { getFamilyForUser } from "@/lib/family"
import { getWeekPlan, getRecipesForFamily } from "@/lib/meals"
import { MealsClient } from "@/components/meals/MealsClient"
import type { SerializedMealPlan, SerializedRecipe, SerializedDinnerEntry } from "@/types/meals"

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ weekStart?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) redirect("/onboarding")

  const { weekStart: weekStartParam } = await searchParams

  let weekStartDate: Date
  if (weekStartParam) {
    const parsed = parseISO(weekStartParam)
    weekStartDate = isValid(parsed)
      ? new Date(weekStartParam + "T00:00:00.000Z")
      : getThisMonday()
  } else {
    weekStartDate = getThisMonday()
  }

  const weekStartStr = format(weekStartDate, "yyyy-MM-dd")

  const [plan, recipeRows] = await Promise.all([
    getWeekPlan(membership.familyId, weekStartDate),
    getRecipesForFamily(membership.familyId),
  ])

  const serializedPlan: SerializedMealPlan | null = plan
    ? {
        id: plan.id,
        weekStart: weekStartStr,
        entries: plan.entries.map(
          (e): SerializedDinnerEntry => ({
            id: e.id,
            planId: plan.id,
            day: e.day,
            title: e.title,
            notes: e.notes,
            recipeUrl: e.recipeUrl,
          })
        ),
      }
    : null

  const serializedRecipes: SerializedRecipe[] = recipeRows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    url: r.url,
    createdById: r.createdById,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <MealsClient
      initialPlan={serializedPlan}
      initialRecipes={serializedRecipes}
      weekStart={weekStartStr}
    />
  )
}

function getThisMonday(): Date {
  const nowOslo = toZonedTime(new Date(), "Europe/Oslo")
  const mondayOslo = startOfISOWeek(nowOslo)
  return new Date(format(mondayOslo, "yyyy-MM-dd") + "T00:00:00.000Z")
}
