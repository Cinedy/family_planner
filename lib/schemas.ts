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

export const createEventSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd").max(128, "Tittel kan ikke være lengre enn 128 tegn"),
  description: z.string().max(512, "Beskrivelse kan ikke være lengre enn 512 tegn").optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ugyldig dato"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Ugyldig starttidspunkt").optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Ugyldig sluttidspunkt").optional(),
  allDay: z.enum(["true", "false"]).optional(),
  color: z.string().optional(),
  repeats: z.enum(["true", "false"]).optional(),
  recurrenceType: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  attendeeIds: z.array(z.string()).optional(),
})

export const updateEventSchema = createEventSchema.extend({
  id: z.string().min(1, "Hendelse-ID er påkrevd"),
})

export const deleteEventSchema = z.object({
  id: z.string().min(1, "Hendelse-ID er påkrevd"),
})

// Handleliste
export const addGroceryItemSchema = z.object({
  listId: z.string().min(1),
  name: z.string().min(1, "Navn er påkrevd").max(128, "Maks 128 tegn"),
  quantity: z.string().max(64).optional(),
})

export const toggleGroceryItemSchema = z.object({
  id: z.string().min(1),
  checked: z.enum(["true", "false"]),
})

export const deleteGroceryItemSchema = z.object({
  id: z.string().min(1),
})

export const clearCheckedGroceryItemsSchema = z.object({
  listId: z.string().min(1),
})

// Gjøreliste
export const addTodoItemSchema = z.object({
  listId: z.string().min(1),
  title: z.string().min(1, "Tittel er påkrevd").max(256, "Maks 256 tegn"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  assignedToId: z.string().optional(),
})

export const toggleTodoItemSchema = z.object({
  id: z.string().min(1),
  completed: z.enum(["true", "false"]),
})

export const deleteTodoItemSchema = z.object({
  id: z.string().min(1),
})

// Måltidsplan
export const setDinnerSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ugyldig ukestart"),
  day: z.coerce.number().int().min(0).max(6),
  title: z.string().min(1, "Tittel er påkrevd").max(256, "Maks 256 tegn"),
  notes: z.string().max(512, "Maks 512 tegn").optional(),
  recipeUrl: z.string().optional(),
})

export const clearDinnerSchema = z.object({
  planId: z.string().min(1),
  day: z.coerce.number().int().min(0).max(6),
})

export const addRecipeSchema = z.object({
  title: z.string().min(1, "Navn er påkrevd").max(256, "Maks 256 tegn"),
  description: z.string().max(512, "Maks 512 tegn").optional(),
  url: z.string().optional(),
})

export const deleteRecipeSchema = z.object({
  id: z.string().min(1),
})
