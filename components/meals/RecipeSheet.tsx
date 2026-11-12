"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { addRecipe } from "@/lib/local/mutations"

interface RecipeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecipeSheet({ open, onOpenChange }: RecipeSheetProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")

  function handleClose() {
    onOpenChange(false)
    setTitle("")
    setDescription("")
    setUrl("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    void addRecipe({ title, description, url })
    handleClose()
  }

  const inputClass = "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  const labelClass = "text-sm font-medium text-foreground"

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="max-h-[calc(var(--vv-height,100dvh)*0.85)] rounded-t-2xl overflow-y-auto pb-safe">
        <SheetHeader>
          <SheetTitle>Ny oppskrift</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-4 pt-2">
          <div className="space-y-1">
            <label className={labelClass}>Navn</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Navn på oppskrift"
              className={inputClass}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Beskrivelse (valgfritt)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kort beskrivelse"
              rows={2}
              className={`${inputClass} h-auto resize-none`}
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Lenke til oppskrift (valgfritt)</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          <Button type="submit" className="w-full min-h-[44px]" disabled={!title.trim()}>
            Legg til
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
