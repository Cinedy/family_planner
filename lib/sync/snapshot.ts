import { prisma } from "@/lib/prisma"
import { getOrCreateGroceryList } from "@/lib/grocery"
import { getOrCreateTodoList } from "@/lib/todos"
import type { getFamilyForUser } from "@/lib/family"
import type { Snapshot } from "@/types/sync"

type Membership = NonNullable<Awaited<ReturnType<typeof getFamilyForUser>>>

const user = (u: { id: string; name: string | null; image: string | null }) => ({
  id: u.id,
  name: u.name,
  image: u.image,
})

export async function getSnapshot(userId: string, membership: Membership): Promise<Snapshot> {
  const familyId = membership.familyId

  const [groceryList, todoList, events, dinners, recipes] = await Promise.all([
    getOrCreateGroceryList(familyId, userId),
    getOrCreateTodoList(familyId, userId),
    prisma.calendarEvent.findMany({
      where: { familyId },
      include: { attendees: { include: { user: true } }, createdBy: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.mealPlanEntry.findMany({
      where: { plan: { familyId }, mealType: "dinner" },
      include: { plan: true },
    }),
    prisma.recipe.findMany({ where: { familyId }, orderBy: { title: "asc" } }),
  ])

  const meMember = membership.family.members.find((m) => m.userId === userId)

  return {
    me: {
      id: userId,
      name: meMember?.user.name ?? null,
      email: meMember?.user.email ?? null,
      image: meMember?.user.image ?? null,
    },
    role: membership.role,
    familyId,
    familyName: membership.family.name,
    staples: membership.family.pantryStaples,
    members: membership.family.members.map((m) => user(m.user)),
    groceryItems: groceryList.items.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      checked: i.checked,
      sortOrder: i.sortOrder,
      createdAt: i.createdAt.toISOString(),
    })),
    todoItems: todoList.items.map((i) => ({
      id: i.id,
      title: i.title,
      completed: i.completed,
      dueDate: i.dueDate?.toISOString() ?? null,
      assignedToId: i.assignedToId,
      assignedTo: i.assignedTo ? user(i.assignedTo) : null,
      sortOrder: i.sortOrder,
      createdAt: i.createdAt.toISOString(),
    })),
    events: events.map((e) => ({
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
      attendees: e.attendees.map((a) => ({ userId: a.userId, user: user(a.user) })),
      createdBy: user(e.createdBy),
    })),
    dinners: dinners.map((d) => ({
      id: d.id,
      // weekStart is stored as midnight UTC on the Monday
      weekStart: d.plan.weekStart.toISOString().slice(0, 10),
      day: d.day,
      title: d.title,
      notes: d.notes,
      recipeUrl: d.recipeUrl,
      ingredients: d.ingredients,
    })),
    recipes: recipes.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      url: r.url,
      ingredients: r.ingredients,
      createdById: r.createdById,
      createdAt: r.createdAt.toISOString(),
    })),
  }
}
