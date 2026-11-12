"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  ShoppingCart,
  CheckSquare,
  UtensilsCrossed,
  LayoutDashboard,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { href: "/dashboard", label: "Hjem", icon: LayoutDashboard },
  { href: "/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/grocery", label: "Handleliste", icon: ShoppingCart },
  { href: "/todos", label: "Gjøremål", icon: CheckSquare },
  { href: "/meals", label: "Måltidsplan", icon: UtensilsCrossed },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-56 flex-col border-r bg-background h-dvh sticky top-0">
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="text-xl">🏠</span>
        <span className="font-semibold text-sm">Familieplanlegger</span>
      </div>
      <Separator />
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <Separator />
      <div className="px-2 py-4">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Innstillinger
        </Link>
      </div>
    </aside>
  )
}
