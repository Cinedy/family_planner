import { prisma } from "@/lib/prisma"
import { Prisma } from "@/lib/generated/prisma/client"
import type { SyncOp } from "@/lib/sync/ops"
import { normalizeName } from "@/lib/ingredients"

type Tx = Prisma.TransactionClient

export type ApplyContext = {
  userId: string
  familyId: string
  role: "admin" | "member"
  memberIds: Set<string>
}

/**
 * Applies ops in order. Each op runs in its own transaction and is idempotent,
 * so a retried batch is harmless. Ops that touch rows outside the user's family
 * are ignored. Data errors (e.g. a row that no longer exists) skip that op;
 * connection errors are rethrown so the client keeps the batch and retries.
 */
export async function applyOps(ops: SyncOp[], ctx: ApplyContext): Promise<{ skipped: number }> {
  let skipped = 0
  for (const op of ops) {
    try {
      await prisma.$transaction((tx) => applyOp(tx, op, ctx), { timeout: 15000 })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        console.warn("[sync] skipped op", op.type, err.code)
        skipped++
        continue
      }
      throw err
    }
  }
  return { skipped }
}

async function familyListId(tx: Tx, kind: "grocery" | "todo", ctx: ApplyContext): Promise<string> {
  if (kind === "grocery") {
    const list = await tx.groceryList.findFirst({ where: { familyId: ctx.familyId } })
    if (list) return list.id
    const created = await tx.groceryList.create({
      data: { familyId: ctx.familyId, createdById: ctx.userId, title: "Handleliste" },
    })
    return created.id
  }
  const list = await tx.todoList.findFirst({ where: { familyId: ctx.familyId } })
  if (list) return list.id
  const created = await tx.todoList.create({
    data: { familyId: ctx.familyId, createdById: ctx.userId, title: "Gjøremål" },
  })
  return created.id
}

function weekStartDate(ymd: string) {
  return new Date(ymd + "T00:00:00.000Z")
}

async function applyOp(tx: Tx, op: SyncOp, ctx: ApplyContext): Promise<void> {
  const { familyId } = ctx

  switch (op.type) {
    // ─── Handleliste ────────────────────────────────────────────────────────
    case "grocery.upsert": {
      const existing = await tx.groceryItem.findUnique({ where: { id: op.id }, include: { list: true } })
      if (existing && existing.list.familyId !== familyId) return
      const data = {
        name: op.name,
        quantity: op.quantity,
        checked: op.checked,
        sortOrder: op.sortOrder,
        ...(op.category !== undefined && { category: op.category }),
      }
      if (existing) {
        await tx.groceryItem.update({ where: { id: op.id }, data })
      } else {
        const listId = await familyListId(tx, "grocery", ctx)
        await tx.groceryItem.create({ data: { id: op.id, listId, addedById: ctx.userId, ...data } })
      }
      return
    }
    case "grocery.setChecked":
      await tx.groceryItem.updateMany({
        where: { id: op.id, list: { familyId } },
        data: { checked: op.checked },
      })
      return
    case "grocery.delete":
      await tx.groceryItem.deleteMany({ where: { id: op.id, list: { familyId } } })
      return
    case "grocery.reorder":
      for (const [index, id] of op.ids.entries()) {
        await tx.groceryItem.updateMany({ where: { id, list: { familyId } }, data: { sortOrder: index } })
      }
      return
    case "grocery.clearChecked":
      await tx.groceryItem.deleteMany({ where: { id: { in: op.ids }, list: { familyId }, checked: true } })
      return

    // ─── Gjøremål ───────────────────────────────────────────────────────────
    case "todo.upsert": {
      const existing = await tx.todoItem.findUnique({ where: { id: op.id }, include: { list: true } })
      if (existing && existing.list.familyId !== familyId) return
      const data = {
        title: op.title,
        completed: op.completed,
        dueDate: op.dueDate ? new Date(op.dueDate) : null,
        assignedToId: op.assignedToId && ctx.memberIds.has(op.assignedToId) ? op.assignedToId : null,
        sortOrder: op.sortOrder,
      }
      if (existing) {
        await tx.todoItem.update({ where: { id: op.id }, data })
      } else {
        const listId = await familyListId(tx, "todo", ctx)
        await tx.todoItem.create({ data: { id: op.id, listId, ...data } })
      }
      return
    }
    case "todo.setCompleted":
      await tx.todoItem.updateMany({
        where: { id: op.id, list: { familyId } },
        data: { completed: op.completed },
      })
      return
    case "todo.delete":
      await tx.todoItem.deleteMany({ where: { id: op.id, list: { familyId } } })
      return
    case "todo.reorder":
      for (const [index, id] of op.ids.entries()) {
        await tx.todoItem.updateMany({ where: { id, list: { familyId } }, data: { sortOrder: index } })
      }
      return

    // ─── Kalender ───────────────────────────────────────────────────────────
    case "event.upsert": {
      const existing = await tx.calendarEvent.findUnique({ where: { id: op.id } })
      if (existing && existing.familyId !== familyId) return
      if (existing && existing.createdById !== ctx.userId && ctx.role !== "admin") return

      const attendeeIds = op.attendeeIds.filter((id) => ctx.memberIds.has(id))
      const data = {
        title: op.title,
        description: op.description,
        startTime: new Date(op.startTime),
        endTime: op.endTime ? new Date(op.endTime) : null,
        allDay: op.allDay,
        color: op.color,
        recurrence: op.recurrence,
      }
      if (existing) {
        await tx.eventAttendee.deleteMany({ where: { eventId: op.id } })
        await tx.calendarEvent.update({ where: { id: op.id }, data })
      } else {
        await tx.calendarEvent.create({
          data: { id: op.id, familyId, createdById: ctx.userId, ...data },
        })
      }
      if (attendeeIds.length) {
        await tx.eventAttendee.createMany({
          data: attendeeIds.map((userId) => ({ eventId: op.id, userId })),
        })
      }
      return
    }
    case "event.delete": {
      const existing = await tx.calendarEvent.findUnique({ where: { id: op.id } })
      if (!existing || existing.familyId !== familyId) return
      if (existing.createdById !== ctx.userId && ctx.role !== "admin") return
      await tx.calendarEvent.delete({ where: { id: op.id } })
      return
    }

    // ─── Måltider ───────────────────────────────────────────────────────────
    case "dinner.set": {
      const existing = await tx.mealPlanEntry.findUnique({ where: { id: op.id }, include: { plan: true } })
      if (existing && existing.plan.familyId !== familyId) return

      const weekStart = weekStartDate(op.weekStart)
      const plan = await tx.mealPlan.upsert({
        where: { familyId_weekStart: { familyId, weekStart } },
        create: { familyId, weekStart },
        update: {},
      })
      // One dinner per day: remove any other entry for that day
      await tx.mealPlanEntry.deleteMany({
        where: { planId: plan.id, day: op.day, mealType: "dinner", id: { not: op.id } },
      })
      const data = {
        planId: plan.id,
        day: op.day,
        mealType: "dinner" as const,
        title: op.title,
        notes: op.notes,
        recipeUrl: op.recipeUrl,
        ...(op.ingredients && { ingredients: op.ingredients }),
      }
      await tx.mealPlanEntry.upsert({ where: { id: op.id }, create: { id: op.id, ...data }, update: data })
      return
    }
    case "dinner.clear":
      await tx.mealPlanEntry.deleteMany({
        where: {
          plan: { familyId, weekStart: weekStartDate(op.weekStart) },
          day: op.day,
          mealType: "dinner",
        },
      })
      return
    case "recipe.upsert": {
      const existing = await tx.recipe.findUnique({ where: { id: op.id } })
      if (existing && existing.familyId !== familyId) return
      const data = {
        title: op.title,
        description: op.description,
        url: op.url,
        ...(op.ingredients && { ingredients: op.ingredients }),
      }
      if (existing) {
        await tx.recipe.update({ where: { id: op.id }, data })
      } else {
        await tx.recipe.create({ data: { id: op.id, familyId, createdById: ctx.userId, ...data } })
      }
      return
    }
    case "recipe.delete":
      await tx.recipe.deleteMany({ where: { id: op.id, familyId } })
      return

    // ─── Familie ────────────────────────────────────────────────────────────
    case "family.setStaples":
      await tx.family.update({ where: { id: familyId }, data: { pantryStaples: op.staples } })
      return
    case "family.setCategoryOrder":
      await tx.family.update({ where: { id: familyId }, data: { groceryCategoryOrder: op.order } })
      return
    case "family.setCategoryHint": {
      const family = await tx.family.findUnique({ where: { id: familyId }, select: { groceryCategoryHints: true } })
      const hints = { ...(family?.groceryCategoryHints as Record<string, string> | null) }
      const key = normalizeName(op.name)
      delete hints[key] // re-insert so it counts as most recent
      hints[key] = op.category
      // Keep the most recent 1000 names (objects keep insertion order)
      const entries = Object.entries(hints)
      const trimmed = Object.fromEntries(entries.slice(Math.max(0, entries.length - 1000)))
      await tx.family.update({ where: { id: familyId }, data: { groceryCategoryHints: trimmed } })
      return
    }
  }
}
