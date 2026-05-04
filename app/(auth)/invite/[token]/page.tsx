import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Phase 2: Full implementation of invitation acceptance
// For now this is a placeholder that will be built in Phase 2
export default function InvitePage({ params }: { params: { token: string } }) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
        <CardTitle>Du er invitert!</CardTitle>
        <CardDescription>Bli med i familieplanleggeren</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 text-center">
          Invitasjonstoken: <code className="text-xs bg-muted px-1 rounded">{params.token}</code>
        </p>
        <Button className="w-full" disabled>
          Godta invitasjon (kommer snart)
        </Button>
      </CardContent>
    </Card>
  )
}
