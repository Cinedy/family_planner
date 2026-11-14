"use client"

import { useRef, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GroceryAddInputProps {
  onAdd: (name: string) => void
}

export function GroceryAddInput({ onAdd }: GroceryAddInputProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setValue("")
    inputRef.current?.focus()
  }

  return (
    <div className="flex items-center gap-2 pt-3 border-t border-border">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Legg til vare, f.eks. 2 l melk"
        className="flex-1 h-11 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button
        onClick={handleSubmit}
        size="icon"
        aria-label="Legg til"
        disabled={!value.trim()}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  )
}
