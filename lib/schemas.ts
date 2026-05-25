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
