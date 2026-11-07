"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getFamilyForUser } from "@/lib/family"
import { createEventSchema, updateEventSchema, deleteEventSchema } from "@/lib/schemas"
import { fromZonedTime } from "date-fns-tz"

type ActionState = { error?: string; fieldErrors?: Record<string, string[]> }

const TIMEZONE = "Europe/Oslo"
const DAY_NAMES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]

function buildRRule(recurrenceType: string, startUTC: Date): string {
  const freq = recurrenceType.toUpperCase()
  if (recurrenceType === "weekly") {
    const byday = DAY_NAMES[startUTC.getDay()]
    return `FREQ=WEEKLY;BYDAY=${byday}`
  }
  return `FREQ=${freq}`
}

function parseDateTime(date: string, time: string | undefined, allDay: boolean): Date {
  if (allDay || !time) {
    return fromZonedTime(`${date}T00:00:00`, TIMEZONE)
  }
  return fromZonedTime(`${date}T${time}:00`, TIMEZONE)
}

export async function createEvent(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const raw = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    date: formData.get("date"),
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
    allDay: formData.get("allDay") ?? "false",
    color: formData.get("color") || undefined,
    repeats: formData.get("repeats") ?? "false",
    recurrenceType: formData.get("recurrenceType") || undefined,
    attendeeIds: formData.getAll("attendeeIds") as string[],
  }

  const parsed = createEventSchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const { title, description, date, startTime, endTime, allDay, color, repeats, recurrenceType, attendeeIds } = parsed.data

  const isAllDay = allDay === "true"
  const startUTC = parseDateTime(date, startTime, isAllDay)
  const endUTC = endTime && !isAllDay ? parseDateTime(date, endTime, false) : null
  const recurrence = repeats === "true" && recurrenceType ? buildRRule(recurrenceType, startUTC) : null

  await prisma.calendarEvent.create({
    data: {
      familyId: membership.familyId,
      createdById: session.user.id,
      title,
      description: description ?? null,
      startTime: startUTC,
      endTime: endUTC,
      allDay: isAllDay,
      color: color ?? null,
      recurrence,
      attendees: attendeeIds?.length
        ? { createMany: { data: attendeeIds.map((userId) => ({ userId })) } }
        : undefined,
    },
  })

  revalidatePath("/calendar")
  return {}
}

export async function updateEvent(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const raw = {
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    date: formData.get("date"),
    startTime: formData.get("startTime") || undefined,
    endTime: formData.get("endTime") || undefined,
    allDay: formData.get("allDay") ?? "false",
    color: formData.get("color") || undefined,
    repeats: formData.get("repeats") ?? "false",
    recurrenceType: formData.get("recurrenceType") || undefined,
    attendeeIds: formData.getAll("attendeeIds") as string[],
  }

  const parsed = updateEventSchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const { id, title, description, date, startTime, endTime, allDay, color, repeats, recurrenceType, attendeeIds } = parsed.data

  const existing = await prisma.calendarEvent.findUnique({ where: { id } })
  if (!existing || existing.familyId !== membership.familyId) {
    return { error: "Hendelsen ble ikke funnet" }
  }
  if (existing.createdById !== session.user.id && membership.role !== "admin") {
    return { error: "Du har ikke tilgang til å endre denne hendelsen" }
  }

  const isAllDay = allDay === "true"
  const startUTC = parseDateTime(date, startTime, isAllDay)
  const endUTC = endTime && !isAllDay ? parseDateTime(date, endTime, false) : null
  const recurrence = repeats === "true" && recurrenceType ? buildRRule(recurrenceType, startUTC) : null

  await prisma.$transaction([
    prisma.eventAttendee.deleteMany({ where: { eventId: id } }),
    prisma.calendarEvent.update({
      where: { id },
      data: {
        title,
        description: description ?? null,
        startTime: startUTC,
        endTime: endUTC,
        allDay: isAllDay,
        color: color ?? null,
        recurrence,
        attendees: attendeeIds?.length
          ? { createMany: { data: attendeeIds.map((userId) => ({ userId })) } }
          : undefined,
      },
    }),
  ])

  revalidatePath("/calendar")
  return {}
}

export async function deleteEvent(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: "Du er ikke med i noen familie" }

  const parsed = deleteEventSchema.safeParse({ id: formData.get("id") })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const { id } = parsed.data

  const existing = await prisma.calendarEvent.findUnique({ where: { id } })
  if (!existing || existing.familyId !== membership.familyId) {
    return { error: "Hendelsen ble ikke funnet" }
  }
  if (existing.createdById !== session.user.id && membership.role !== "admin") {
    return { error: "Du har ikke tilgang til å slette denne hendelsen" }
  }

  await prisma.calendarEvent.delete({ where: { id } })

  revalidatePath("/calendar")
  return {}
}
