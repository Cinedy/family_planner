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

/**
 * iOS Safari doesn't move fixed elements when the keyboard opens, so it covers
 * bottom sheets. Expose the keyboard height and visible height as CSS variables
 * (--keyboard-inset, --vv-height) so sheets can sit above the keyboard.
 */
function KeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => {
      // When pinch-zoomed the visual viewport also shrinks; that isn't the keyboard
      const zoomed = vv.scale > 1.01
      const inset = zoomed ? 0 : Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.style.setProperty("--keyboard-inset", `${Math.round(inset)}px`)
      root.style.setProperty("--vv-height", `${Math.round(zoomed ? window.innerHeight : vv.height)}px`)
    }
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeColorSync />
      <KeyboardInset />
      {children}
    </ThemeProvider>
  )
}
