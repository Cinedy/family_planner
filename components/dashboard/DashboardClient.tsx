"use client"

import Link from "next/link"
import { useLiveQuery } from "dexie-react-hooks"
import { formatInTimeZone, toZonedTime } from "date-fns-tz"
import { addDays, format, getISODay, startOfISOWeek } from "date-fns"
import { nb } from "date-fns/locale"
import { CalendarDays, Check, CheckSquare, ChevronRight, ShoppingCart, UtensilsCrossed } from "lucide-react"
import { db } from "@/lib/local/db"
import { occurrenceTimeLabel, osloDayKey, TIMEZONE, upcomingOccurrences } from "@/lib/calendar-utils"
import { dueStatus } from "@/lib/due-dates"
import { groupBySection } from "@/lib/grocery-categories"
import { useNow } from "@/lib/use-now"
import { PersonAvatar } from "@/components/PersonAvatar"
import { setTodoCompleted } from "@/lib/local/mutations"
import { showUndo } from "@/lib/undo"
import { useMeta } from "@/components/sync/SyncProvider"
import { cn } from "@/lib/utils"
import type { LocalTodoItem } from "@/types/sync"

function getGreeting(name: string | null | undefined, now: Date): string {
  const hour = toZonedTime(now, TIMEZONE).getHours()
  const firstName = name?.split(" ")[0] ?? ""
  const suffix = firstName ? `, ${firstName}` : ""
  if (hour < 12) return `God morgen${suffix}!`
  if (hour < 17) return `God ettermiddag${suffix}!`
  return `God kveld${suffix}!`
}

/** "I dag", "I morgen" or "fredag 21. nov" — in Oslo days */
function dayLabel(date: Date, now: Date) {
  const day = osloDayKey(date)
  if (day === osloDayKey(now)) return "I dag"
  if (day === osloDayKey(addDays(now, 1))) return "I morgen"
  return formatInTimeZone(date, TIMEZONE, "EEEE d. MMM", { locale: nb })
}

function SectionHeading({ icon: Icon, title, href, linkText }: { icon: typeof CalendarDays; title: string; href: string; linkText: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Icon className="size-3.5" />
        {title}
      </h2>
      <Link href={href} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors min-h-[32px]">
        {linkText} <ChevronRight className="size-3.5" />
      </Link>
    </div>
  )
}

export function DashboardClient() {
  const meta = useMeta()
  const now = useNow()
  const osloNow = toZonedTime(now, TIMEZONE)
  const weekStart = format(startOfISOWeek(osloNow), "yyyy-MM-dd")
  const todayIndex = getISODay(osloNow) - 1 // 0 = Monday

  const todayDinner = useLiveQuery(
    () => db.dinners.where("weekStart").equals(weekStart).filter((d) => d.day === todayIndex).first(),
    [weekStart, todayIndex]
  )
  const events = useLiveQuery(() => db.events.toArray(), [], [])
  const openTodos = useLiveQuery(() => db.todoItems.filter((t) => !t.completed).toArray(), [], [])
  const groceries = useLiveQuery(() => db.groceryItems.filter((i) => !i.checked).toArray(), [], [])
  // Same order as the grocery list: by store section, then the family's order
  const groceryPreview = groupBySection(groceries, meta.categoryOrder, meta.categoryHints).flatMap((s) => s.items)

  // Due today or overdue: overdue first, then the ones assigned to me, then the list order
  const mine = (t: LocalTodoItem) => Number(t.assignedToId === meta.me.id)
  const dueTodos = openTodos
    .map((todo) => ({ todo, due: dueStatus(todo.dueDate, now) }))
    .filter((d): d is { todo: LocalTodoItem; due: NonNullable<typeof d.due> } => d.due !== null && d.due.state !== "future")
    .sort((a, b) => a.due.day.localeCompare(b.due.day) || mine(b.todo) - mine(a.todo) || a.todo.sortOrder - b.todo.sortOrder)
  const otherOpen = openTodos.length - dueTodos.length

  const upcoming = upcomingOccurrences(events, 3, 60, now)

  function complete(todo: LocalTodoItem) {
    void setTodoCompleted(todo.id, true)
    showUndo(`«${todo.title}» fullført`, () => void setTodoCompleted(todo.id, false))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{getGreeting(meta.me.name, now)}</h1>

      {/* Gjøremål i dag */}
      <section className="space-y-2">
        <SectionHeading icon={CheckSquare} title="Gjøremål i dag" href="/todos" linkText="Alle gjøremål" />
        <div className="rounded-lg border border-border overflow-hidden">
          {dueTodos.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Ingen frister i dag 🎉</p>
          ) : (
            <ul className="divide-y divide-border">
              {dueTodos.map(({ todo, due }) => {
                const overdue = due.state === "overdue"
                return (
                  <li key={todo.id} className="flex items-center gap-3 px-3 min-h-[52px]">
                    <button
                      onClick={() => complete(todo)}
                      aria-label={`Merk «${todo.title}» som fullført`}
                      className="size-11 -m-3 flex shrink-0 items-center justify-center group"
                    >
                      <span className="size-5 rounded-full border-2 border-input bg-background flex items-center justify-center group-hover:border-primary">
                        <Check className="size-3 opacity-0 group-hover:opacity-40" strokeWidth={3} />
                      </span>
                    </button>
                    <div className="flex-1 min-w-0 py-2">
                      <p className="text-sm truncate">{todo.title}</p>
                      <p className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                        {overdue ? `Forfalt ${due.label}` : "I dag"}
                      </p>
                    </div>
                    {todo.assignedTo && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                        <PersonAvatar person={todo.assignedTo} />
                        {todo.assignedTo.id === meta.me.id ? "Deg" : (todo.assignedTo.name?.split(" ")[0] ?? "")}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {otherOpen > 0 && (
            <Link
              href="/todos"
              className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted/50"
            >
              {otherOpen} {otherOpen === 1 ? "annet åpent gjøremål" : "andre åpne gjøremål"}
              <ChevronRight className="size-3.5" />
            </Link>
          )}
        </div>
      </section>

      {/* Middag i dag */}
      <section className="space-y-2">
        <SectionHeading icon={UtensilsCrossed} title="Middag i dag" href="/meals" linkText="Se ukesplan" />
        <div className="rounded-lg border border-border p-4">
          {todayDinner ? (
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{todayDinner.title}</span>
              {todayDinner.recipeUrl && (
                <a
                  href={todayDinner.recipeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
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
        <SectionHeading icon={CalendarDays} title="Kommende hendelser" href="/calendar" linkText="Kalender" />
        <div className="rounded-lg border border-border overflow-hidden">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Ingen kommende hendelser</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((occ) => {
                // An event that is already under way is shown as today
                const shownDay = occ.start < now ? now : occ.start
                return (
                  <li key={occ.key} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: occ.event.color ?? "var(--primary)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{occ.event.title}</p>
                      <p className="text-xs text-muted-foreground first-letter:uppercase">
                        {dayLabel(shownDay, now)} · {occurrenceTimeLabel(occ, shownDay)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Handleliste */}
      <section className="space-y-2">
        <SectionHeading icon={ShoppingCart} title="Handleliste" href="/grocery" linkText="Åpne" />
        <Link href="/grocery" className="block rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
          {groceries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tom liste</p>
          ) : (
            <>
              <p className="text-sm font-medium">
                {groceries.length} {groceries.length === 1 ? "vare" : "varer"} å handle
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {groceryPreview.slice(0, 5).map((g) => g.name).join(", ")}
                {groceryPreview.length > 5 && ` +${groceryPreview.length - 5}`}
              </p>
            </>
          )}
        </Link>
      </section>
    </div>
  )
}
