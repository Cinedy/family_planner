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

// Fields that open the on-screen keyboard
const TEXT_FIELD =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="date"]):not([type="time"]), textarea, [contenteditable="true"]'

/** Nearest ancestor that scrolls vertically (a bottom sheet or the main area). */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node
  }
  return null
}

/** Scroll so the field sits in the part of its scroll area that isn't behind the keyboard. */
function reveal(field: HTMLElement, vv: VisualViewport) {
  const container = scrollParent(field)
  const rect = field.getBoundingClientRect()
  const top = Math.max(vv.offsetTop, container?.getBoundingClientRect().top ?? 0)
  const bottom = vv.offsetTop + vv.height
  const margin = 16
  if (rect.top >= top + margin && rect.bottom <= bottom - margin) return // already visible

  const room = bottom - top
  // Centre short fields; align tall ones (like the ingredients box) to the top
  const target = rect.height < room - 2 * margin ? top + (room - rect.height) / 2 : top + margin
  const scroller = container ?? document.scrollingElement
  scroller?.scrollBy({ top: rect.top - target, behavior: "smooth" })
}

/**
 * Keeps text fields visible above the iOS keyboard, everywhere in the app.
 *
 * iOS Safari doesn't move fixed elements when the keyboard opens, and only scrolls
 * the page itself to reveal a focused field, not scroll areas inside it (our bottom
 * sheets and the main content area). So:
 * 1. expose the keyboard height and visible height as CSS variables
 *    (--keyboard-inset, --vv-height): bottom sheets sit on top of the keyboard and
 *    the main area gets extra bottom padding to scroll into;
 * 2. whenever a text field is focused, once the keyboard has settled, scroll it
 *    into the middle of the visible area.
 */
function KeyboardAware() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    let revealTimer: ReturnType<typeof setTimeout> | undefined

    const activeField = () => {
      const el = document.activeElement
      return el instanceof HTMLElement && el.matches(TEXT_FIELD) ? el : null
    }

    const revealSoon = (delay: number) => {
      clearTimeout(revealTimer)
      revealTimer = setTimeout(() => {
        const field = activeField()
        if (field) reveal(field, vv)
      }, delay)
    }

    const update = () => {
      // When pinch-zoomed the visual viewport also shrinks; that isn't the keyboard
      const zoomed = vv.scale > 1.01
      const inset = zoomed ? 0 : Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.style.setProperty("--keyboard-inset", `${Math.round(inset)}px`)
      root.style.setProperty("--vv-height", `${Math.round(zoomed ? window.innerHeight : vv.height)}px`)
      // The home-indicator gap is hidden behind the keyboard, so don't pad for it then
      root.classList.toggle("keyboard-open", inset > 0)
      // The keyboard is opening/closing: reveal the field once it has settled
      if (inset > 0 && activeField()) revealSoon(120)
    }

    // Moving to another field while the keyboard is already open doesn't resize
    // the viewport, so also reveal on focus
    const onFocusIn = () => {
      if (activeField()) revealSoon(350)
    }

    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    document.addEventListener("focusin", onFocusIn)
    return () => {
      clearTimeout(revealTimer)
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
      document.removeEventListener("focusin", onFocusIn)
    }
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeColorSync />
      <KeyboardAware />
      {children}
    </ThemeProvider>
  )
}
