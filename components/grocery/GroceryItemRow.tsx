"use client"

import { GripVertical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SerializedGroceryItem } from "@/types/grocery"

interface GroceryItemRowProps {
  item: SerializedGroceryItem
  onToggle: (id: string, checked: boolean) => void
  onDelete: (id: string) => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}

export function GroceryItemRow({ item, onToggle, onDelete, dragHandleProps }: GroceryItemRowProps) {
  return (
    <div className="flex items-center gap-2 px-1 min-h-[44px] group">
      {dragHandleProps && (
        <button
          {...dragHandleProps}
          className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Dra for å sortere"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <button
        onClick={() => onToggle(item.id, !item.checked)}
        aria-label={item.checked ? "Merk som ikke kjøpt" : "Merk som kjøpt"}
        className={cn(
          "size-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
          item.checked
            ? "bg-primary border-primary text-primary-foreground"
            : "border-input bg-background hover:border-primary"
        )}
      >
        {item.checked && (
          <svg className="size-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm transition-colors",
            item.checked && "line-through text-muted-foreground opacity-60"
          )}
        >
          {item.name}
        </span>
        {item.quantity && (
          <span className="text-xs text-muted-foreground ml-1.5">{item.quantity}</span>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onDelete(item.id)}
        aria-label="Fjern vare"
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}
