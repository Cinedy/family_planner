"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getFamilyForUser } from "@/lib/family"
import { fromZonedTime } from "date-fns-tz"
import {
  addTodoItemSchema,
  toggleTodoItemSchema,
  deleteTodoItemSchema,
} from "@/lib/schemas"

type ActionState = { error?: string; fieldErrors?: Record<string, string[]> }
type AddTodoResult = ActionState & {
  item?: {
    id: string
    title: string
    completed: boolean
    dueDate: string | null
    assignedToId: string | null
    assignedTo: { id: string; name: string | null; image: string | null } | null
    createdAt: string
  }
}

const TIMEZONE = "Europe/Oslo"

export async function addTodoItem(
  _prev: ActionState | null,
  formData: FormData
): Promise<AddTodoResult> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const parsed = addTodoItemSchema.safeParse({
    listId: formData.get("listId"),
    title: formData.get("title"),
    dueDate: formData.get("dueDate") || undefined,
    assignedToId: formData.get("assignedToId") || undefined,
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const list = await prisma.todoList.findUnique({ where: { id: parsed.data.listId } })
  if (!list || list.familyId !== membership.familyId) return { error: "Liste ikke funnet" }

  const dueDate = parsed.data.dueDate
    ? fromZonedTime(`${parsed.data.dueDate}T00:00:00`, TIMEZONE)
    : null

  const created = await prisma.todoItem.create({
    data: {
      listId: parsed.data.listId,
      title: parsed.data.title,
      dueDate,
      assignedToId: parsed.data.assignedToId ?? null,
    },
    include: { assignedTo: true },
  })

  revalidatePath("/todos")
  return {
    item: {
      id: created.id,
      title: created.title,
      completed: false,
      dueDate: created.dueDate?.toISOString() ?? null,
      assignedToId: created.assignedToId,
      assignedTo: created.assignedTo
        ? { id: created.assignedTo.id, name: created.assignedTo.name, image: created.assignedTo.image }
        : null,
      createdAt: created.createdAt.toISOString(),
    },
  }
}

export async function toggleTodoItem(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const parsed = toggleTodoItemSchema.safeParse({
    id: formData.get("id"),
    completed: formData.get("completed"),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const item = await prisma.todoItem.findUnique({
    where: { id: parsed.data.id },
    include: { list: true },
  })
  if (!item || item.list.familyId !== membership.familyId) return { error: "Gjøremål ikke funnet" }

  await prisma.todoItem.update({
    where: { id: parsed.data.id },
    data: { completed: parsed.data.completed === "true" },
  })

  revalidatePath("/todos")
  return {}
}

export async function reorderTodoItems(
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
      prisma.todoItem.update({ where: { id }, data: { sortOrder: index } })
    )
  )

  revalidatePath("/todos")
  return {}
}

export async function deleteTodoItem(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const parsed = deleteTodoItemSchema.safeParse({ id: formData.get("id") })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const item = await prisma.todoItem.findUnique({
    where: { id: parsed.data.id },
    include: { list: true },
  })
  if (!item || item.list.familyId !== membership.familyId) return { error: "Gjøremål ikke funnet" }

  await prisma.todoItem.delete({ where: { id: parsed.data.id } })

  revalidatePath("/todos")
  return {}
}
