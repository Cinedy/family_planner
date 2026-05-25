import { auth, signIn } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: `/invite/${token}` })
            }}
          >
            <Button type="submit" className="w-full min-h-[44px]">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Fortsett med Google
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  const alreadyMember = await prisma.familyMember.findUnique({
    where: {
      familyId_userId: { familyId: invitation.familyId, userId: session.user.id },
    },
  })

  if (alreadyMember) {
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
