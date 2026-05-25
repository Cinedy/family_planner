import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateFamilyForm } from "@/components/family/create-family-form"
import { Users, Mail } from "lucide-react"

export default function OnboardingPage() {
  return (
    <div className="w-full max-w-md space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-2">🏠</div>
        <h1 className="text-2xl font-bold">Kom i gang</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Opprett en familie eller vent på invitasjon fra et familiemedlem.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Opprett familie
          </CardTitle>
          <CardDescription>Lag en ny familie og inviter andre etterpå</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateFamilyForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Bli med via lenke
          </CardTitle>
          <CardDescription>Venter du på en invitasjon?</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Be et familiemedlem sende deg en invitasjonslenke via Innstillinger.
            Sjekk e-posten din for en lenke.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
