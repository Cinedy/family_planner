"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { inputClass, labelClass } from "@/components/ui/form-styles"
import { cn } from "@/lib/utils"
import { addTodoItem, updateTodoItem } from "@/lib/local/mutations"
import { TIMEZONE } from "@/lib/calendar-utils"
import type { LocalTodoItem, Member } from "@/types/sync"

interface TodoSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyMembers: Member[]
  /** null = new to-do */
  item: LocalTodoItem | null
  onDelete: (item: LocalTodoItem) => void
}

/** Stored due date (UTC) → the date input's "yyyy-MM-dd" in Oslo time */
const toDateInput = (iso: string | null) => (iso ? format(toZonedTime(parseISO(iso), TIMEZONE), "yyyy-MM-dd") : "")

// The parent remounts this component (via `key`) each time it opens.
export function TodoSheet({ open, onOpenChange, familyMembers, item, onDelete }: TodoSheetProps) {
  const [title, setTitle] = useState(item?.title ?? "")
  const [dueDate, setDueDate] = useState(toDateInput(item?.dueDate ?? null))
  const [assignedToId, setAssignedToId] = useState<string | null>(item?.assignedToId ?? null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (item) void updateTodoItem(item.id, { title, dueDate, assignedToId })
    else void addTodoItem({ title, dueDate: dueDate || undefined, assignedToId })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[calc(var(--vv-height,100dvh)*0.85)] rounded-t-2xl overflow-y-auto pb-safe">
        <SheetHeader>
          <SheetTitle>{item ? "Rediger gjøremål" : "Nytt gjøremål"}</SheetTitle>
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
              autoFocus={!item}
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Frist (valgfritt)</label>
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate("")}
                  className="text-xs text-muted-foreground hover:text-foreground min-h-[32px] px-1"
                >
                  Fjern frist
                </button>
              )}
            </div>
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

          <Button type="submit" className="w-full min-h-[44px]" disabled={!title.trim()}>
            {item ? "Lagre" : "Legg til"}
          </Button>
        </form>

        {item && (
          <SheetFooter className="border-t border-border pt-2 px-4 pb-4">
            <Button
              variant="destructive"
              className="w-full min-h-[44px]"
              onClick={() => {
                onOpenChange(false)
                onDelete(item)
              }}
            >
              Slett gjøremål
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
