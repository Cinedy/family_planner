import { prisma } from "@/lib/prisma"

export async function getOrCreateGroceryList(familyId: string, userId: string) {
  const existing = await prisma.groceryList.findFirst({
    where: { familyId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  })
  if (existing) return existing

  return prisma.groceryList.create({
    data: {
      familyId,
      createdById: userId,
      title: "Handleliste",
    },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  })
}
