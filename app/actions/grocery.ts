"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getFamilyForUser } from "@/lib/family"
import {
  addGroceryItemSchema,
  toggleGroceryItemSchema,
  deleteGroceryItemSchema,
  clearCheckedGroceryItemsSchema,
} from "@/lib/schemas"

type ActionState = { error?: string; fieldErrors?: Record<string, string[]> }
type AddGroceryResult = ActionState & {
  item?: { id: string; name: string; quantity: string | null; checked: boolean; createdAt: string }
}

export async function addGroceryItem(
  _prev: ActionState | null,
  formData: FormData
): Promise<AddGroceryResult> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const parsed = addGroceryItemSchema.safeParse({
    listId: formData.get("listId"),
    name: formData.get("name"),
    quantity: formData.get("quantity") || undefined,
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const list = await prisma.groceryList.findUnique({ where: { id: parsed.data.listId } })
  if (!list || list.familyId !== membership.familyId) return { error: "Liste ikke funnet" }

  const created = await prisma.groceryItem.create({
    data: {
      listId: parsed.data.listId,
      addedById: session.user.id,
      name: parsed.data.name,
      quantity: parsed.data.quantity ?? null,
    },
  })

  revalidatePath("/grocery")
  return {
    item: {
      id: created.id,
      name: created.name,
      quantity: created.quantity,
      checked: false,
      createdAt: created.createdAt.toISOString(),
    },
  }
}

export async function toggleGroceryItem(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const parsed = toggleGroceryItemSchema.safeParse({
    id: formData.get("id"),
    checked: formData.get("checked"),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const item = await prisma.groceryItem.findUnique({
    where: { id: parsed.data.id },
    include: { list: true },
  })
  if (!item || item.list.familyId !== membership.familyId) return { error: "Vare ikke funnet" }

  await prisma.groceryItem.update({
    where: { id: parsed.data.id },
    data: { checked: parsed.data.checked === "true" },
  })

  revalidatePath("/grocery")
  return {}
}

export async function deleteGroceryItem(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const parsed = deleteGroceryItemSchema.safeParse({ id: formData.get("id") })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const item = await prisma.groceryItem.findUnique({
    where: { id: parsed.data.id },
    include: { list: true },
  })
  if (!item || item.list.familyId !== membership.familyId) return { error: "Vare ikke funnet" }

  await prisma.groceryItem.delete({ where: { id: parsed.data.id } })

  revalidatePath("/grocery")
  return {}
}

export async function reorderGroceryItems(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const orderedIds: string[] = JSON.parse(formData.get("orderedIds") as string)

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.groceryItem.update({ where: { id }, data: { sortOrder: index } })
    )
  )

  revalidatePath("/grocery")
  return {}
}

export async function clearCheckedGroceryItems(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const parsed = clearCheckedGroceryItemsSchema.safeParse({ listId: formData.get("listId") })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const list = await prisma.groceryList.findUnique({ where: { id: parsed.data.listId } })
  if (!list || list.familyId !== membership.familyId) return { error: "Liste ikke funnet" }

  await prisma.groceryItem.deleteMany({ where: { listId: parsed.data.listId, checked: true } })

  revalidatePath("/grocery")
  return {}
}
