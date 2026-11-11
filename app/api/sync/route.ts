import { auth } from "@/auth"
import { getFamilyForUser } from "@/lib/family"
import { getSnapshot } from "@/lib/sync/snapshot"
import { applyOps } from "@/lib/sync/apply"
import { syncOpSchema, type SyncOp } from "@/lib/sync/ops"

const noStore = { "Cache-Control": "no-store" }

async function getContext() {
  const session = await auth()
  if (!session?.user?.id) return { error: Response.json({ error: "unauthorized" }, { status: 401, headers: noStore }) }

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) return { error: Response.json({ noFamily: true }, { status: 409, headers: noStore }) }

  return { userId: session.user.id, membership }
}

export async function GET() {
  const ctx = await getContext()
  if ("error" in ctx) return ctx.error

  const snapshot = await getSnapshot(ctx.userId, ctx.membership)
  return Response.json(snapshot, { headers: noStore })
}

export async function POST(request: Request) {
  const ctx = await getContext()
  if ("error" in ctx) return ctx.error

  const body = (await request.json().catch(() => null)) as { ops?: unknown } | null
  if (!body || !Array.isArray(body.ops)) {
    return Response.json({ error: "invalid body" }, { status: 400, headers: noStore })
  }

  // Validate each op on its own: an invalid op is dropped instead of blocking the queue
  const ops: SyncOp[] = []
  let rejected = 0
  for (const raw of body.ops) {
    const parsed = syncOpSchema.safeParse(raw)
    if (parsed.success) ops.push(parsed.data)
    else rejected++
  }

  const { skipped } = await applyOps(ops, {
    userId: ctx.userId,
    familyId: ctx.membership.familyId,
    role: ctx.membership.role,
    memberIds: new Set(ctx.membership.family.members.map((m) => m.userId)),
  })

  return Response.json({ ok: true, rejected, skipped }, { headers: noStore })
}
