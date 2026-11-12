"use client"

import { useEffect } from "react"
import { ThemeProvider, useTheme } from "next-themes"

// Same values as viewport.themeColor in app/layout.tsx
const THEME_COLORS = { light: "#ffffff", dark: "#0a0a0a" }

/** Keeps the browser/status bar colour in step with the in-app light/dark switch. */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme()
  useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute("content", THEME_COLORS[resolvedTheme]))
  }, [resolvedTheme])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeColorSync />
      {children}
    </ThemeProvider>
  )
}
