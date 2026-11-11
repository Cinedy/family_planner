"use client"

import Link from "next/link"
import { useLiveQuery } from "dexie-react-hooks"
import { toZonedTime } from "date-fns-tz"
import { format, getISODay, startOfISOWeek } from "date-fns"
import { nb } from "date-fns/locale"
import { CalendarDays, CheckSquare, ChevronRight, ShoppingCart, UtensilsCrossed } from "lucide-react"
import { db } from "@/lib/local/db"
import { TIMEZONE, upcomingOccurrences } from "@/lib/calendar-utils"
import { useMeta } from "@/components/sync/SyncProvider"

function getGreeting(name: string | null | undefined): string {
  const hour = toZonedTime(new Date(), TIMEZONE).getHours()
  const firstName = name?.split(" ")[0] ?? ""
  const suffix = firstName ? `, ${firstName}` : ""
  if (hour < 12) return `God morgen${suffix}!`
  if (hour < 17) return `God ettermiddag${suffix}!`
  return `God kveld${suffix}!`
}

export function DashboardClient() {
  const meta = useMeta()
  const now = toZonedTime(new Date(), TIMEZONE)
  const weekStart = format(startOfISOWeek(now), "yyyy-MM-dd")
  const todayIndex = getISODay(now) - 1 // 0 = Monday

  const todayDinner = useLiveQuery(
    () => db.dinners.where("weekStart").equals(weekStart).filter((d) => d.day === todayIndex).first(),
    [weekStart, todayIndex]
  )
  const events = useLiveQuery(() => db.events.toArray(), [], [])
  const pendingTodos = useLiveQuery(() => db.todoItems.filter((t) => !t.completed).count(), [], 0)
  const groceryCount = useLiveQuery(() => db.groceryItems.filter((i) => !i.checked).count(), [], 0)

  const upcomingEvents = upcomingOccurrences(events, 3).map(({ event, start }) => ({
    ...event,
    key: `${event.id}-${start.getTime()}`,
    start: toZonedTime(start, TIMEZONE),
  }))
  const greeting = getGreeting(meta.me.name)

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
                key={event.key}
                className={`flex items-center gap-3 px-4 py-3 ${i < upcomingEvents.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="text-center min-w-[36px]">
                  <p className="text-xs text-muted-foreground capitalize">
                    {format(event.start, "EEE", { locale: nb })}
                  </p>
                  <p className="text-sm font-semibold leading-tight">
                    {format(event.start, "d", { locale: nb })}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  {!event.allDay && (
                    <p className="text-xs text-muted-foreground">
                      {format(event.start, "HH:mm", { locale: nb })}
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
            {pendingTodos === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen aktive</p>
            ) : (
              <>
                <span className="text-2xl font-bold">{pendingTodos}</span>
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
