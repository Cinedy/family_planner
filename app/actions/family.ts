"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { addDays } from "date-fns"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getFamilyForUser } from "@/lib/family"
import { createFamilySchema } from "@/lib/schemas"

type ActionState = { error?: string; fieldErrors?: Record<string, string[]> }

export async function createFamily(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session) redirect("/login")

  const existing = await getFamilyForUser(session.user.id)
  if (existing) return { error: "Du er allerede med i en familie" }

  const parsed = createFamilySchema.safeParse({ name: formData.get("name") })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  await prisma.$transaction([
    prisma.family.create({
      data: {
        name: parsed.data.name,
        members: {
          create: { userId: session.user.id, role: "admin" },
        },
      },
    }),
  ])

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

const INVITE_DAYS = 7

/**
 * Creates an invitation the admin shares themselves (text, iMessage, …).
 * Returns the token; the page builds the link from its own address.
 * Each link can be used by one person, for 7 days.
 */
export async function createInvitation(): Promise<{ error?: string; token?: string }> {
  const session = await auth()
  if (!session) return { error: "Ikke innlogget" }

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }
  if (membership.role !== "admin") return { error: "Kun administratorer kan invitere" }

  const invitation = await prisma.invitation.create({
    data: {
      familyId: membership.familyId,
      invitedById: session.user.id,
      expiresAt: addDays(new Date(), INVITE_DAYS),
    },
  })
  return { token: invitation.token }
}

export async function acceptInvitation(token: string): Promise<void> {
  const session = await auth()
  if (!session) redirect(`/invite/${token}`)

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { family: true },
  })

  if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    redirect(`/invite/${token}`)
  }

  const currentMembership = await getFamilyForUser(session.user.id)
  if (currentMembership?.familyId === invitation.familyId) redirect("/dashboard")
  // One family per user: the invite page explains how to leave the current one first
  if (currentMembership) redirect(`/invite/${token}`)

  await prisma.$transaction([
    prisma.invitation.update({ where: { token }, data: { status: "accepted" } }),
    prisma.familyMember.create({
      data: { familyId: invitation.familyId, userId: session.user.id, role: "member" },
    }),
  ])

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function leaveFamily(): Promise<ActionState> {
  const session = await auth()
  if (!session) return { error: "Ikke innlogget" }

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const { familyId } = membership
  const others = membership.family.members.filter((m) => m.userId !== session.user.id)

  if (others.length === 0) {
    // Last member: the family and all its data are deleted (the UI asks for confirmation)
    await prisma.family.delete({ where: { id: familyId } })
  } else {
    const otherAdmins = others.filter((m) => m.role === "admin")
    await prisma.$transaction([
      // Never leave a family without an admin: promote the longest-standing member
      ...(membership.role === "admin" && otherAdmins.length === 0
        ? [prisma.familyMember.update({ where: { id: others[0].id }, data: { role: "admin" } })]
        : []),
      prisma.familyMember.delete({
        where: { familyId_userId: { familyId, userId: session.user.id } },
      }),
    ])
  }

  revalidatePath("/", "layout")
  redirect("/onboarding")
}
