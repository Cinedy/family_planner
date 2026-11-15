"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { EventForm } from "./EventForm"
import { deleteEvent, deleteEventOccurrence } from "@/lib/local/mutations"
import type { SerializedEvent } from "@/types/calendar"
import type { Member } from "@/types/sync"

interface EventSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: SerializedEvent | null
  /** The tapped occurrence when the event repeats */
  occurrenceStart: Date | null
  defaultDate: Date
  familyMembers: Member[]
  currentUserId: string
  isAdmin: boolean
}

export function EventSheet({
  open,
  onOpenChange,
  event,
  occurrenceStart,
  defaultDate,
  familyMembers,
  currentUserId,
  isAdmin,
}: EventSheetProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Same rule as the server: only the creator or an admin can change an event
  const canEdit = !event || event.createdById === currentUserId || isAdmin

  const isSeriesOccurrence = Boolean(event?.recurrence && occurrenceStart)

  function handleDelete(scope: "all" | "this") {
    if (event && scope === "this" && occurrenceStart) void deleteEventOccurrence(event, occurrenceStart)
    else if (event) void deleteEvent(event.id)
    handleClose()
  }

  function handleClose() {
    onOpenChange(false)
    setConfirmDelete(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="max-h-[calc(var(--vv-height,100dvh)*0.92)] rounded-t-2xl overflow-y-auto pb-safe"
      >
        <SheetHeader>
          <SheetTitle>{event ? "Rediger hendelse" : "Ny hendelse"}</SheetTitle>
        </SheetHeader>

        <EventForm
          event={event}
          occurrenceStart={occurrenceStart}
          defaultDate={defaultDate}
          familyMembers={familyMembers}
          currentUserId={currentUserId}
          canEdit={canEdit}
          onSuccess={handleClose}
        />

        {event && canEdit && (
          <SheetFooter className="border-t border-border pt-2">
            {!confirmDelete ? (
              <Button
                variant="destructive"
                className="w-full min-h-[44px]"
                onClick={() => setConfirmDelete(true)}
              >
                Slett hendelse
              </Button>
            ) : (
              <div className="w-full space-y-2">
                {isSeriesOccurrence ? (
                  <>
                    <p className="text-sm text-center text-muted-foreground">
                      Dette er en gjentakende hendelse. Hva vil du slette?
                    </p>
                    <Button variant="destructive" className="w-full min-h-[44px]" onClick={() => handleDelete("this")}>
                      Bare denne
                    </Button>
                    <Button variant="outline" className="w-full min-h-[44px] text-destructive" onClick={() => handleDelete("all")}>
                      Hele serien
                    </Button>
                    <Button variant="ghost" className="w-full min-h-[44px]" onClick={() => setConfirmDelete(false)}>
                      Avbryt
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-center text-muted-foreground">Er du sikker?</p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setConfirmDelete(false)}>
                        Avbryt
                      </Button>
                      <Button variant="destructive" className="flex-1 min-h-[44px]" onClick={() => handleDelete("all")}>
                        Slett
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
