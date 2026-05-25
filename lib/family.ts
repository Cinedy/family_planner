import { prisma } from "@/lib/prisma"

export async function getFamilyForUser(userId: string) {
  return prisma.familyMember.findFirst({
    where: { userId },
    include: {
      family: {
        include: {
          members: {
            include: { user: true },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
    },
  })
}
