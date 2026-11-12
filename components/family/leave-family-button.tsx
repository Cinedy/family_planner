"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { leaveFamily } from "@/app/actions/family"
import { db } from "@/lib/local/db"
import { Button } from "@/components/ui/button"

function ConfirmButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="destructive" className="flex-1 min-h-[44px]" disabled={pending}>
      {pending ? "Forlater..." : "Ja, forlat"}
    </Button>
  )
}

export function LeaveFamilyButton({ isLastMember }: { isLastMember: boolean }) {
  const [confirming, setConfirming] = useState(false)
  const [state, formAction] = useActionState(async () => {
    // Drop this family's data (and any unsynced changes) from the device first
    await db.delete()
    return leaveFamily()
  }, null)

  if (!confirming) {
    return (
      <Button variant="destructive" className="w-full min-h-[44px]" onClick={() => setConfirming(true)}>
        Forlat familien
      </Button>
    )
  }

  return (
    <form action={formAction} className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {isLastMember
          ? "Du er det eneste medlemmet. Familien og alle data (kalender, lister, måltider) slettes permanent."
          : "Er du sikker? Du mister tilgang til familiens data."}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1 min-h-[44px]" onClick={() => setConfirming(false)}>
          Avbryt
        </Button>
        <ConfirmButton />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  )
}
