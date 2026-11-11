"use client"

import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { addDays, format, getISOWeek, parseISO } from "date-fns"
import { nb } from "date-fns/locale"
import { ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/local/db"
import { DinnerSheet } from "./DinnerSheet"
import type { SerializedDinnerEntry, SerializedRecipe } from "@/types/meals"

interface WeekPlanTabProps {
  weekStart: string
  onWeekChange: (weekStart: string) => void
  recipes: SerializedRecipe[]
}

export function WeekPlanTab({ weekStart, onWeekChange, recipes }: WeekPlanTabProps) {
  const entries = useLiveQuery(() => db.dinners.where("weekStart").equals(weekStart).toArray(), [weekStart], [])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingDay, setEditingDay] = useState(0)
  const [editingEntry, setEditingEntry] = useState<SerializedDinnerEntry | null>(null)

  const monday = parseISO(weekStart)
  const sunday = addDays(monday, 6)
  const weekHeader = `Uke ${getISOWeek(monday)} (${format(monday, "d.", { locale: nb })}–${format(sunday, "d. MMM", { locale: nb })})`

  function navigate(direction: "prev" | "next") {
    onWeekChange(format(addDays(monday, direction === "prev" ? -7 : 7), "yyyy-MM-dd"))
  }

  function openSheet(day: number, entry: SerializedDinnerEntry | null) {
    setEditingDay(day)
    setEditingEntry(entry)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("prev")}
          aria-label="Forrige uke"
          className="size-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-sm font-semibold">{weekHeader}</span>
        <button
          onClick={() => navigate("next")}
          aria-label="Neste uke"
          className="size-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        {Array.from({ length: 7 }, (_, dayIndex) => {
          const entry = entries.find((e) => e.day === dayIndex) ?? null
          const dayLabel = format(addDays(monday, dayIndex), "EEEE d. MMM", { locale: nb })

          return (
            <div
              key={dayIndex}
              className="flex items-center gap-3 px-3 min-h-[56px] border-b border-border last:border-0"
            >
              <span className="text-sm text-muted-foreground w-28 shrink-0 capitalize">{dayLabel}</span>

              {entry ? (
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{entry.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {entry.recipeUrl && (
                      <a
                        href={entry.recipeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Åpne oppskrift"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openSheet(dayIndex, entry)}
                      aria-label="Rediger middag"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground gap-1.5"
                  onClick={() => openSheet(dayIndex, null)}
                >
                  <Plus className="size-3.5" />
                  Legg til middag
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <DinnerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        weekStart={weekStart}
        day={editingDay}
        entry={editingEntry}
        recipes={recipes}
      />
    </div>
  )
}
