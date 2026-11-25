import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getFamilyForUser } from "@/lib/family"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SignInButtons } from "@/components/auth/SignInButtons"
import { AcceptInvitationForm } from "@/components/family/accept-invitation-form"

function Message({
  emoji,
  title,
  children,
  action,
}: {
  emoji: string
  title: string
  children: React.ReactNode
  action?: { href: string; label: string }
}) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">{emoji}</div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{children}</CardDescription>
      </CardHeader>
      {action && (
        <CardContent>
          <Link
            href={action.href}
            className="flex h-11 w-full items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium"
          >
            {action.label}
          </Link>
        </CardContent>
      )}
    </Card>
  )
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const [invitation, session] = await Promise.all([
    prisma.invitation.findUnique({ where: { token }, include: { family: true, invitedBy: true } }),
    auth(),
  ])
  const membership = session?.user?.id ? await getFamilyForUser(session.user.id) : null

  // Already in the inviting family: the link has done its job, whatever its state.
  // (People often tap the link again in Messages after joining.)
  if (invitation && membership?.familyId === invitation.familyId) {
    return (
      <Message emoji="✅" title="Du er allerede med!" action={{ href: "/dashboard", label: "Gå til appen" }}>
        Du er medlem av {invitation.family.name}.
      </Message>
    )
  }

  if (!invitation) {
    return (
      <Message emoji="🔗" title="Fant ikke invitasjonen">
        Lenken er ufullstendig eller feil. Sjekk at hele lenken ble med, eller be om en ny lenke.
      </Message>
    )
  }

  if (invitation.status === "accepted") {
    return (
      <Message emoji="⛔" title="Lenken er allerede brukt">
        Hver invitasjonslenke kan bare brukes av én person. Be {invitation.invitedBy.name ?? "den som inviterte deg"} om en
        ny lenke.
      </Message>
    )
  }

  if (invitation.status === "expired" || invitation.expiresAt < new Date()) {
    return (
      <Message emoji="⌛" title="Lenken har utløpt">
        Invitasjonslenker varer i 7 dager. Be {invitation.invitedBy.name ?? "den som inviterte deg"} om en ny lenke.
      </Message>
    )
  }

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

  if (membership) {
    return (
      <Message emoji="👪" title="Du er allerede med i en familie" action={{ href: "/settings", label: "Gå til innstillinger" }}>
        Du er medlem av <strong>{membership.family.name}</strong>. For å bli med i <strong>{invitation.family.name}</strong>{" "}
        må du først forlate din nåværende familie under Innstillinger, og deretter åpne denne lenken igjen.
      </Message>
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
