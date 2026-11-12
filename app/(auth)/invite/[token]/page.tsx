import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getFamilyForUser } from "@/lib/family"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SignInButtons } from "@/components/auth/SignInButtons"
import { AcceptInvitationForm } from "@/components/family/accept-invitation-form"

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { family: true, invitedBy: true },
  })

  const isValid =
    invitation &&
    invitation.status === "pending" &&
    invitation.expiresAt > new Date()

  if (!isValid) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">⛔</div>
          <CardTitle>Ugyldig invitasjon</CardTitle>
          <CardDescription>
            Denne invitasjonslenken er ugyldig eller har utløpt.
            Be om en ny invitasjon fra familieadministratoren.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const session = await auth()

  if (!session) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
          <CardTitle>Du er invitert!</CardTitle>
          <CardDescription>
            Logg inn for å bli med i <strong>{invitation.family.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInButtons redirectTo={`/invite/${token}`} />
        </CardContent>
      </Card>
    )
  }

  const currentMembership = await getFamilyForUser(session.user.id)

  if (currentMembership && currentMembership.familyId !== invitation.familyId) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">👪</div>
          <CardTitle>Du er allerede med i en familie</CardTitle>
          <CardDescription>
            Du er medlem av <strong>{currentMembership.family.name}</strong>. For å bli med i{" "}
            <strong>{invitation.family.name}</strong> må du først forlate din nåværende familie
            under Innstillinger, og deretter åpne denne lenken igjen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/settings"
            className="flex h-11 w-full items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium"
          >
            Gå til innstillinger
          </a>
        </CardContent>
      </Card>
    )
  }

  if (currentMembership) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">✅</div>
          <CardTitle>Du er allerede med!</CardTitle>
          <CardDescription>
            Du er allerede et medlem av {invitation.family.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/dashboard"
            className="flex h-11 w-full items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium"
          >
            Gå til appen
          </a>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
        <CardTitle>Bli med i familien</CardTitle>
        <CardDescription>
          Du er invitert til <strong>{invitation.family.name}</strong>
          {invitation.invitedBy.name && ` av ${invitation.invitedBy.name}`}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInvitationForm token={token} />
      </CardContent>
    </Card>
  )
}
