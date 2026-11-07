"use client"

import { useState } from "react"
import { useActionState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { EventForm } from "./EventForm"
import { deleteEvent } from "@/app/actions/calendar"
import type { SerializedEvent, FamilyMemberForCalendar } from "@/types/calendar"

interface EventSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: SerializedEvent | null
  defaultDate: Date
  familyMembers: FamilyMemberForCalendar[]
  currentUserId: string
}

export function EventSheet({
  open,
  onOpenChange,
  event,
  defaultDate,
  familyMembers,
  currentUserId,
}: EventSheetProps) {
  const [deleteState, deleteAction] = useActionState(deleteEvent, null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleClose() {
    onOpenChange(false)
    setConfirmDelete(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] rounded-t-2xl overflow-y-auto pb-safe"
      >
        <SheetHeader>
          <SheetTitle>{event ? "Rediger hendelse" : "Ny hendelse"}</SheetTitle>
        </SheetHeader>

        <EventForm
          event={event}
          defaultDate={defaultDate}
          familyMembers={familyMembers}
          currentUserId={currentUserId}
          onSuccess={handleClose}
        />

        {event && (
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
                <p className="text-sm text-center text-muted-foreground">Er du sikker?</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 min-h-[44px]"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Avbryt
                  </Button>
                  <form action={deleteAction} className="flex-1">
                    <input type="hidden" name="id" value={event.id} />
                    <Button
                      type="submit"
                      variant="destructive"
                      className="w-full min-h-[44px]"
                    >
                      Slett
                    </Button>
                  </form>
                </div>
                {deleteState?.error && (
                  <p className="text-sm text-destructive text-center">{deleteState.error}</p>
                )}
              </div>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
