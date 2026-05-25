"use client"

import { useFormStatus } from "react-dom"
import { acceptInvitation } from "@/app/actions/family"
import { Button } from "@/components/ui/button"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full min-h-[44px]" disabled={pending}>
      {pending ? "Godtar..." : "Godta invitasjon"}
    </Button>
  )
}

export function AcceptInvitationForm({ token }: { token: string }) {
  const boundAction = acceptInvitation.bind(null, token)
  return (
    <form action={boundAction}>
      <SubmitButton />
    </form>
  )
}
