import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SignInButtons } from "@/components/auth/SignInButtons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">🏠</div>
        <CardTitle className="text-2xl">Familieplanlegger</CardTitle>
        <CardDescription>Logg inn for å se familiens planer</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignInButtons redirectTo="/dashboard" />
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/personvern" className="underline underline-offset-2 hover:text-foreground">
            Personvern
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
