import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Mail } from "lucide-react"

export default async function SettingsPage() {
  const session = await auth()
  const user = session?.user

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Innstillinger</h1>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Familie
          </CardTitle>
          <CardDescription>Administrer familiemedlemmer og invitasjoner</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Familieadministrasjon kommer i fase 2</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Inviter familiemedlem
          </CardTitle>
          <CardDescription>Send en invitasjonslenke via e-post</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Invitasjoner kommer i fase 2</p>
        </CardContent>
      </Card>
    </div>
  )
}
