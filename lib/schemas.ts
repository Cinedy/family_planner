import { z } from "zod"

export const createFamilySchema = z.object({
  name: z
    .string()
    .min(1, "Familienavn er påkrevd")
    .max(64, "Familienavnet kan ikke være lengre enn 64 tegn"),
})

export const inviteByEmailSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
})

// Empty date/time inputs submit "" — allow that alongside a valid value
const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ugyldig dato").or(z.literal("")).optional()
const optionalTime = z.string().regex(/^\d{2}:\d{2}$/, "Ugyldig tidspunkt").or(z.literal("")).optional()

export const createEventSchema = z.object({
  title: z.string().trim().min(1, "Tittel er påkrevd").max(128, "Tittel kan ikke være lengre enn 128 tegn"),
  description: z.string().max(512, "Beskrivelse kan ikke være lengre enn 512 tegn").optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Velg en dato"),
  endDate: optionalDate,
  startTime: optionalTime,
  endTime: optionalTime,
  allDay: z.enum(["true", "false"]).optional(),
  color: z.string().optional(),
  repeats: z.enum(["true", "false"]).optional(),
  recurrenceType: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  repeatUntil: optionalDate,
  attendeeIds: z.array(z.string()).optional(),
})
