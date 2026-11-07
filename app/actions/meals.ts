"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getFamilyForUser } from "@/lib/family"
import {
  setDinnerSchema,
  clearDinnerSchema,
  addRecipeSchema,
  deleteRecipeSchema,
} from "@/lib/schemas"
import type { SerializedDinnerEntry, SerializedRecipe } from "@/types/meals"

type ActionState = { error?: string; fieldErrors?: Record<string, string[]> }
type SetDinnerResult = ActionState & { item?: SerializedDinnerEntry }
type AddRecipeResult = ActionState & { item?: SerializedRecipe }

export async function setDinner(
  _prev: ActionState | null,
  formData: FormData
): Promise<SetDinnerResult> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const parsed = setDinnerSchema.safeParse({
    weekStart: formData.get("weekStart"),
    day: formData.get("day"),
    title: formData.get("title"),
    notes: formData.get("notes") || undefined,
    recipeUrl: formData.get("recipeUrl") || undefined,
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const { weekStart, day, title, notes, recipeUrl } = parsed.data
  const weekStartDate = new Date(weekStart + "T00:00:00.000Z")

  const plan = await prisma.mealPlan.upsert({
    where: {
      familyId_weekStart: { familyId: membership.familyId, weekStart: weekStartDate },
    },
    create: { familyId: membership.familyId, weekStart: weekStartDate },
    update: {},
  })

  await prisma.mealPlanEntry.deleteMany({
    where: { planId: plan.id, day, mealType: "dinner" },
  })

  const entry = await prisma.mealPlanEntry.create({
    data: {
      planId: plan.id,
      day,
      mealType: "dinner",
      title,
      notes: notes ?? null,
      recipeUrl: recipeUrl || null,
    },
  })

  revalidatePath("/meals")
  return {
    item: {
      id: entry.id,
      planId: plan.id,
      day: entry.day,
      title: entry.title,
      notes: entry.notes,
      recipeUrl: entry.recipeUrl,
    },
  }
}

export async function clearDinner(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const parsed = clearDinnerSchema.safeParse({
    planId: formData.get("planId"),
    day: formData.get("day"),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const plan = await prisma.mealPlan.findUnique({ where: { id: parsed.data.planId } })
  if (!plan || plan.familyId !== membership.familyId) return { error: "Plan ikke funnet" }

  await prisma.mealPlanEntry.deleteMany({
    where: { planId: parsed.data.planId, day: parsed.data.day, mealType: "dinner" },
  })

  revalidatePath("/meals")
  return {}
}

export async function addRecipe(
  _prev: ActionState | null,
  formData: FormData
): Promise<AddRecipeResult> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const parsed = addRecipeSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    url: formData.get("url") || undefined,
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const recipe = await prisma.recipe.create({
    data: {
      familyId: membership.familyId,
      createdById: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      url: parsed.data.url || null,
    },
  })

  revalidatePath("/meals")
  return {
    item: {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      url: recipe.url,
      createdById: recipe.createdById,
      createdAt: recipe.createdAt.toISOString(),
    },
  }
}

export async function deleteRecipe(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const parsed = deleteRecipeSchema.safeParse({ id: formData.get("id") })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const recipe = await prisma.recipe.findUnique({ where: { id: parsed.data.id } })
  if (!recipe || recipe.familyId !== membership.familyId) return { error: "Oppskrift ikke funnet" }

  await prisma.recipe.delete({ where: { id: parsed.data.id } })

  revalidatePath("/meals")
  return {}
}
