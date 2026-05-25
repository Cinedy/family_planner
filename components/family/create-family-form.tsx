"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { createFamily } from "@/app/actions/family"
import { Button } from "@/components/ui/button"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full min-h-[44px]" disabled={pending}>
      {pending ? "Oppretter..." : "Opprett familie"}
    </Button>
  )
}

export function CreateFamilyForm() {
  const [state, formAction] = useActionState(createFamily, null)

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1">
        <input
          name="name"
          type="text"
          placeholder="Familiens navn, f.eks. Familie Hansen"
          required
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {state?.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        )}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  )
}
