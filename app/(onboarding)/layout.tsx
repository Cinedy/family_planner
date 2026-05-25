import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getFamilyForUser } from "@/lib/family"

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (membership) redirect("/dashboard")

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      {children}
    </div>
  )
}
