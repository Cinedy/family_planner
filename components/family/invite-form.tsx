"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { inviteByEmail } from "@/app/actions/family"
import { Button } from "@/components/ui/button"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="min-h-[44px]" disabled={pending}>
      {pending ? "Sender..." : "Send"}
    </Button>
  )
}

export function InviteForm() {
  // Count successful sends; a new count remounts (and so clears) the form
  const [state, formAction] = useActionState(
    async (prev: (Awaited<ReturnType<typeof inviteByEmail>> & { sent: number }) | null, formData: FormData) => {
      const result = await inviteByEmail(prev, formData)
      return { ...result, sent: (prev?.sent ?? 0) + (result.success ? 1 : 0) }
    },
    null
  )
  const resetKey = state?.sent ?? 0

  return (
    <div className="space-y-2">
      <form key={resetKey} action={formAction}>
        <div className="flex gap-2">
          <input
            name="email"
            type="email"
            placeholder="epost@eksempel.no"
            required
            className="flex-1 h-11 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <SubmitButton />
        </div>
        {state?.fieldErrors?.email && (
          <p className="text-sm text-destructive mt-1">{state.fieldErrors.email[0]}</p>
        )}
        {state?.error && (
          <p className="text-sm text-destructive mt-1">{state.error}</p>
        )}
      </form>
      {state?.success && (
        <p className="text-sm text-green-600">
          Invitasjon sendt til {state.sentTo}!
        </p>
      )}
    </div>
  )
}
