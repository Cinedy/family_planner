import { prisma } from "@/lib/prisma"

export async function getOrCreateTodoList(familyId: string, userId: string) {
  const existing = await prisma.todoList.findFirst({
    where: { familyId },
    include: {
      items: {
        include: { assignees: { include: { user: true } } },
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
        include: { assignees: { include: { user: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  })
}
