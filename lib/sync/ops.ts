import { z } from "zod"

// Operations the client queues in its outbox and the server applies in order.
// Every row id is generated on the client so ops can be retried safely.

const id = z.string().min(1).max(64)
const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Ugyldig dato")
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const day = z.number().int().min(0).max(6)

export const syncOpSchema = z.discriminatedUnion("type", [
  // Handleliste
  z.object({
    type: z.literal("grocery.upsert"),
    id,
    name: z.string().min(1).max(128),
    quantity: z.string().max(64).nullable(),
    checked: z.boolean(),
    sortOrder: z.number().int(),
  }),
  z.object({ type: z.literal("grocery.setChecked"), id, checked: z.boolean() }),
  z.object({ type: z.literal("grocery.delete"), id }),
  z.object({ type: z.literal("grocery.reorder"), ids: z.array(id).max(1000) }),
  z.object({ type: z.literal("grocery.clearChecked"), ids: z.array(id).max(1000) }),

  // Gjøremål
  z.object({
    type: z.literal("todo.upsert"),
    id,
    title: z.string().min(1).max(256),
    completed: z.boolean(),
    dueDate: isoDate.nullable(),
    assignedToId: id.nullable(),
    sortOrder: z.number().int(),
  }),
  z.object({ type: z.literal("todo.setCompleted"), id, completed: z.boolean() }),
  z.object({ type: z.literal("todo.delete"), id }),
  z.object({ type: z.literal("todo.reorder"), ids: z.array(id).max(1000) }),

  // Kalender
  z.object({
    type: z.literal("event.upsert"),
    id,
    title: z.string().min(1).max(128),
    description: z.string().max(512).nullable(),
    startTime: isoDate,
    endTime: isoDate.nullable(),
    allDay: z.boolean(),
    color: z.string().max(32).nullable(),
    recurrence: z.string().max(256).nullable(),
    attendeeIds: z.array(id).max(50),
  }),
  z.object({ type: z.literal("event.delete"), id }),

  // Måltider
  z.object({
    type: z.literal("dinner.set"),
    id,
    weekStart: ymd,
    day,
    title: z.string().min(1).max(256),
    notes: z.string().max(512).nullable(),
    recipeUrl: z.string().max(2048).nullable(),
  }),
  z.object({ type: z.literal("dinner.clear"), weekStart: ymd, day }),
  z.object({
    type: z.literal("recipe.upsert"),
    id,
    title: z.string().min(1).max(256),
    description: z.string().max(512).nullable(),
    url: z.string().max(2048).nullable(),
  }),
  z.object({ type: z.literal("recipe.delete"), id }),
])

export type SyncOp = z.infer<typeof syncOpSchema>
