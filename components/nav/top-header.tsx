"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { getMeta } from "@/lib/local/db"
import { UserMenu } from "./user-menu"
import { ThemeToggle } from "./ThemeToggle"
import { SyncIndicator } from "@/components/sync/SyncIndicator"

export function TopHeader() {
  const me = useLiveQuery(getMeta)?.me

  return (
    <header className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-background md:px-6">
      <span className="font-semibold text-sm md:hidden">🏠 Familieplanlegger</span>
      <div className="ml-auto flex items-center gap-2">
        <SyncIndicator />
        <ThemeToggle />
        <UserMenu name={me?.name} email={me?.email} image={me?.image} />
      </div>
    </header>
  )
}
