import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getFamilyForUser } from "@/lib/family"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InviteForm } from "@/components/family/invite-form"
import { LeaveFamilyButton } from "@/components/family/leave-family-button"
import { Users, Mail } from "lucide-react"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const user = session.user

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) redirect("/onboarding")
  const family = membership.family
  const isAdmin = membership.role === "admin"

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Innstillinger</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profil</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "Bruker"} />
            <AvatarFallback>{user?.name?.[0]?.toUpperCase() ?? "B"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Family members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {family.name}
          </CardTitle>
          <CardDescription>Familiemedlemmer</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {family.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={m.user.image ?? undefined} alt={m.user.name ?? "Bruker"} />
                  <AvatarFallback>{m.user.name?.[0]?.toUpperCase() ?? "B"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                </div>
                <Badge variant={m.role === "admin" ? "default" : "secondary"}>
                  {m.role === "admin" ? "Admin" : "Medlem"}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Invite */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Inviter familiemedlem
          </CardTitle>
          <CardDescription>Send en invitasjonslenke via e-post</CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <InviteForm />
          ) : (
            <p className="text-sm text-muted-foreground">
              Kun administratorer kan sende invitasjoner.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Leave family */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">Forlat familien</CardTitle>
          <CardDescription>
            Du vil miste tilgang til alle familiens data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveFamilyButton />
        </CardContent>
      </Card>
    </div>
  )
}
