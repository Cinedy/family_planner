"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { leaveFamily } from "@/app/actions/family"
import { Button } from "@/components/ui/button"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="destructive" className="w-full min-h-[44px]" disabled={pending}>
      {pending ? "Forlater..." : "Forlat familien"}
    </Button>
  )
}

export function LeaveFamilyButton() {
  const [state, formAction] = useActionState(leaveFamily, null)
  return (
    <form action={formAction} className="space-y-2">
      <SubmitButton />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  )
}
