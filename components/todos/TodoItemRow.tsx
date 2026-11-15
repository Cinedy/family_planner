"use client"

import { GripVertical, X } from "lucide-react"
import { PersonAvatar } from "@/components/PersonAvatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { dueStatus } from "@/lib/due-dates"
import type { LocalTodoItem } from "@/types/sync"

function DueDatePill({ dueDate }: { dueDate: string }) {
  const due = dueStatus(dueDate)
  if (!due) return null
  const { label } = due

  if (due.state === "overdue") {
    return <Badge variant="destructive">{label}</Badge>
  }
  if (due.state === "today") {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
        {label}
      </Badge>
    )
  }
  return <Badge variant="outline">{label}</Badge>
}

interface TodoItemRowProps {
  item: LocalTodoItem
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEdit: (item: LocalTodoItem) => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}

export function TodoItemRow({ item, onToggle, onDelete, onEdit, dragHandleProps }: TodoItemRowProps) {
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

      <button
        type="button"
        onClick={() => onEdit(item)}
        aria-label={`Rediger ${item.title}`}
        className="flex-1 min-w-0 self-stretch flex flex-col justify-center text-left"
      >
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
            <PersonAvatar person={item.assignedTo} className="size-4" />
          )}
        </div>
      </button>

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
