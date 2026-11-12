"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { addDays } from "date-fns"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getFamilyForUser } from "@/lib/family"
import { resend, buildInviteEmail } from "@/lib/resend"
import { createFamilySchema, inviteByEmailSchema } from "@/lib/schemas"

type ActionState = { error?: string; fieldErrors?: Record<string, string[]> }
type InviteState = ActionState & { success?: true; sentTo?: string }

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

export async function inviteByEmail(
  _prev: InviteState | null,
  formData: FormData
): Promise<InviteState> {
  const session = await auth()
  if (!session) return { error: "Ikke innlogget" }

  const parsed = inviteByEmailSchema.safeParse({ email: formData.get("email") })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const { email } = parsed.data

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }
  if (membership.role !== "admin") return { error: "Kun administratorer kan sende invitasjoner" }

  const { familyId } = membership
  const familyName = membership.family.name
  const invitedByName = session.user.name ?? "Et familiemedlem"

  // Mark old invitations as expired so they don't block a new one
  await prisma.invitation.updateMany({
    where: { familyId, email, status: "pending", expiresAt: { lt: new Date() } },
    data: { status: "expired" },
  })

  const existing = await prisma.invitation.findFirst({
    where: { familyId, email, status: "pending" },
  })
  if (existing) return { error: "En invitasjon er allerede sendt til denne e-postadressen" }

  const invitation = await prisma.invitation.create({
    data: {
      familyId,
      invitedById: session.user.id,
      email,
      expiresAt: addDays(new Date(), 7),
    },
  })

  const { error } = await resend.emails.send(
    buildInviteEmail({ email, familyName, invitedByName, token: invitation.token })
  )

  if (error) {
    await prisma.invitation.delete({ where: { id: invitation.id } })
    return { error: "Kunne ikke sende e-post. Prøv igjen." }
  }

  return { success: true, sentTo: email }
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
