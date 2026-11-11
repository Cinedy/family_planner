"use client"

import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { format, startOfISOWeek } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { cn } from "@/lib/utils"
import { db } from "@/lib/local/db"
import { TIMEZONE } from "@/lib/calendar-utils"
import { WeekPlanTab } from "./WeekPlanTab"
import { RecipesTab } from "./RecipesTab"

function thisMonday(): string {
  return format(startOfISOWeek(toZonedTime(new Date(), TIMEZONE)), "yyyy-MM-dd")
}

export function MealsClient() {
  const [activeTab, setActiveTab] = useState<"ukesplan" | "oppskrifter">("ukesplan")
  const [weekStart, setWeekStart] = useState(thisMonday)
  const recipes = useLiveQuery(
    async () => (await db.recipes.toArray()).sort((a, b) => a.title.localeCompare(b.title, "nb")),
    [],
    []
  )

  const tabClass = (active: boolean) =>
    cn(
      "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
      active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
    )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Måltidsplan</h1>
        <div className="flex gap-1 p-1 bg-muted rounded-full">
          <button onClick={() => setActiveTab("ukesplan")} className={tabClass(activeTab === "ukesplan")}>
            Ukesplan
          </button>
          <button onClick={() => setActiveTab("oppskrifter")} className={tabClass(activeTab === "oppskrifter")}>
            Oppskrifter
          </button>
        </div>
      </div>

      {activeTab === "ukesplan" ? (
        <WeekPlanTab weekStart={weekStart} onWeekChange={setWeekStart} recipes={recipes} />
      ) : (
        <RecipesTab recipes={recipes} />
      )}
    </div>
  )
}
