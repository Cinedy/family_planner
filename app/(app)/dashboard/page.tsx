import { redirect } from "next/navigation"
import Link from "next/link"
import { toZonedTime } from "date-fns-tz"
import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { CalendarDays, CheckSquare, ChevronRight, ShoppingCart, UtensilsCrossed } from "lucide-react"
import { auth } from "@/auth"
import { getFamilyForUser } from "@/lib/family"
import { getDashboardData } from "@/lib/dashboard"

function getGreeting(name: string | null | undefined): string {
  const hour = toZonedTime(new Date(), "Europe/Oslo").getHours()
  const firstName = name?.split(" ")[0] ?? ""
  if (hour < 12) return `God morgen${firstName ? `, ${firstName}` : ""}!`
  if (hour < 17) return `God ettermiddag${firstName ? `, ${firstName}` : ""}!`
  return `God kveld${firstName ? `, ${firstName}` : ""}!`
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const membership = await getFamilyForUser(session.user.id)
  if (!membership) redirect("/onboarding")

  const { todayDinner, upcomingEvents, pendingTodos, groceryCount } =
    await getDashboardData(membership.familyId)

  const greeting = getGreeting(session.user.name)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{greeting}</h1>

      {/* Middag i dag */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <UtensilsCrossed className="size-3.5" />
            Middag i dag
          </h2>
          <Link href="/meals" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
            Se ukesplan <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <div className="rounded-lg border border-border p-4">
          {todayDinner ? (
            <div className="flex items-center justify-between">
              <span className="font-medium">{todayDinner.title}</span>
              {todayDinner.recipeUrl && (
                <a
                  href={todayDinner.recipeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Oppskrift →
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ikke planlagt ennå</p>
          )}
        </div>
      </section>

      {/* Kommende hendelser */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Kommende hendelser
          </h2>
          <Link href="/calendar" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
            Kalender <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Ingen kommende hendelser</p>
          ) : (
            upcomingEvents.map((event, i) => (
              <div
                key={event.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < upcomingEvents.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="text-center min-w-[36px]">
                  <p className="text-xs text-muted-foreground capitalize">
                    {format(event.startTime, "EEE", { locale: nb })}
                  </p>
                  <p className="text-sm font-semibold leading-tight">
                    {format(event.startTime, "d", { locale: nb })}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  {!event.allDay && (
                    <p className="text-xs text-muted-foreground">
                      {format(event.startTime, "HH:mm", { locale: nb })}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Gjøremål + Handleliste */}
      <div className="grid grid-cols-2 gap-3">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <CheckSquare className="size-3.5" />
            Gjøremål
          </h2>
          <Link
            href="/todos"
            className="rounded-lg border border-border p-4 flex flex-col gap-1 hover:bg-muted/50 transition-colors"
          >
            {pendingTodos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen aktive</p>
            ) : (
              <>
                <span className="text-2xl font-bold">{pendingTodos.length}</span>
                <span className="text-xs text-muted-foreground">aktive gjøremål</span>
              </>
            )}
          </Link>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <ShoppingCart className="size-3.5" />
            Handle
          </h2>
          <Link
            href="/grocery"
            className="rounded-lg border border-border p-4 flex flex-col gap-1 hover:bg-muted/50 transition-colors"
          >
            {groceryCount === 0 ? (
              <p className="text-sm text-muted-foreground">Tom liste</p>
            ) : (
              <>
                <span className="text-2xl font-bold">{groceryCount}</span>
                <span className="text-xs text-muted-foreground">
                  {groceryCount === 1 ? "vare" : "varer"} gjenstår
                </span>
              </>
            )}
          </Link>
        </section>
      </div>
    </div>
  )
}
