"use client"

import { GripVertical, X } from "lucide-react"
import { format, isToday, isPast, parseISO } from "date-fns"
import { nb } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SerializedTodoItem } from "@/types/todos"

const TIMEZONE = "Europe/Oslo"

function DueDatePill({ dueDate }: { dueDate: string }) {
  const zoned = toZonedTime(parseISO(dueDate), TIMEZONE)
  const label = isToday(zoned) ? "I dag" : format(zoned, "d. MMM", { locale: nb })
  const isOverdue = !isToday(zoned) && isPast(zoned)

  if (isOverdue) {
    return <Badge variant="destructive">{label}</Badge>
  }
  if (isToday(zoned)) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
        {label}
      </Badge>
    )
  }
  return <Badge variant="outline">{label}</Badge>
}

interface TodoItemRowProps {
  item: SerializedTodoItem
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}

export function TodoItemRow({ item, onToggle, onDelete, dragHandleProps }: TodoItemRowProps) {
  return (
    <div className="flex items-center gap-2 px-1 min-h-[52px] group">
      {dragHandleProps && (
        <button
          {...dragHandleProps}
          className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 shrink-0 text-muted-foreground pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Dra for å sortere"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <button
        onClick={() => onToggle(item.id, !item.completed)}
        aria-label={item.completed ? "Merk som ikke fullført" : "Merk som fullført"}
        className={cn(
          "size-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5",
          item.completed
            ? "bg-primary border-primary text-primary-foreground"
            : "border-input bg-background hover:border-primary"
        )}
      >
        {item.completed && (
          <svg className="size-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm block leading-tight",
            item.completed && "line-through text-muted-foreground opacity-60"
          )}
        >
          {item.title}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.dueDate && !item.completed && <DueDatePill dueDate={item.dueDate} />}
          {item.assignedTo && (
            <span className="size-4 rounded-full bg-muted border border-background flex items-center justify-center text-[9px] font-medium overflow-hidden shrink-0">
              {item.assignedTo.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.assignedTo.image} alt={item.assignedTo.name ?? ""} className="size-full object-cover" />
              ) : (
                (item.assignedTo.name?.[0] ?? "?").toUpperCase()
              )}
            </span>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onDelete(item.id)}
        aria-label="Slett gjøremål"
        className="pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 focus-visible:opacity-100 shrink-0 text-muted-foreground"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}
