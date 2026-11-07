"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { addTodoItem } from "@/app/actions/todos"
import type { FamilyMemberForTodos, SerializedTodoItem } from "@/types/todos"

interface TodoSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listId: string
  familyMembers: FamilyMemberForTodos[]
  onSuccess: (item: SerializedTodoItem) => void
}

export function TodoSheet({ open, onOpenChange, listId, familyMembers, onSuccess }: TodoSheetProps) {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [assignedToId, setAssignedToId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    onOpenChange(false)
    setTitle("")
    setDueDate("")
    setAssignedToId(null)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setIsPending(true)
    setError(null)

    const fd = new FormData()
    fd.set("listId", listId)
    fd.set("title", title.trim())
    if (dueDate) fd.set("dueDate", dueDate)
    if (assignedToId) fd.set("assignedToId", assignedToId)

    const result = await addTodoItem(null, fd)
    setIsPending(false)

    if (result.error) {
      setError(result.error)
    } else if (result.item) {
      onSuccess(result.item)
      handleClose()
    }
  }

  const inputClass = "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  const labelClass = "text-sm font-medium text-foreground"

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl overflow-y-auto pb-safe">
        <SheetHeader>
          <SheetTitle>Nytt gjøremål</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-4 pt-2">
          <div className="space-y-1">
            <label className={labelClass}>Hva skal gjøres?</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tittel"
              className={inputClass}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Frist (valgfritt)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {familyMembers.length > 1 && (
            <div className="space-y-2">
              <label className={labelClass}>Tildel til (valgfritt)</label>
              <div className="flex flex-wrap gap-2">
                {familyMembers.map((member) => {
                  const isSelected = assignedToId === member.id
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setAssignedToId(isSelected ? null : member.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors min-h-[36px]",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-input bg-background hover:bg-muted"
                      )}
                    >
                      <span className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium overflow-hidden shrink-0">
                        {member.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={member.image} alt={member.name ?? ""} className="size-full object-cover" />
                        ) : (
                          (member.name?.[0] ?? "?").toUpperCase()
                        )}
                      </span>
                      {member.name ?? "Ukjent"}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full min-h-[44px]" disabled={isPending || !title.trim()}>
            {isPending ? "Legger til..." : "Legg til"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
