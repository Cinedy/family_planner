import { prisma } from "@/lib/prisma"

export async function getOrCreateTodoList(familyId: string, userId: string) {
  const existing = await prisma.todoList.findFirst({
    where: { familyId },
    include: {
      items: {
        include: { assignedTo: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  })
  if (existing) return existing

  return prisma.todoList.create({
    data: {
      familyId,
      createdById: userId,
      title: "Gjøremål",
    },
    include: {
      items: {
        include: { assignedTo: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  })
}

export async function getFamilyMembersForTodos(familyId: string) {
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
