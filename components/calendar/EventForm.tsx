"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { z } from "zod"
import { createEventSchema } from "@/lib/schemas"
import { saveEvent } from "@/lib/local/mutations"
import { TIMEZONE } from "@/lib/calendar-utils"
import { Button } from "@/components/ui/button"
import { inputClass, labelClass } from "@/components/ui/form-styles"
import { cn } from "@/lib/utils"
import type { SerializedEvent } from "@/types/calendar"
import type { Member } from "@/types/sync"

type FormValues = z.infer<typeof createEventSchema>

const COLORS = [
  { hex: "#3b82f6", label: "Blå" },
  { hex: "#ef4444", label: "Rød" },
  { hex: "#22c55e", label: "Grønn" },
  { hex: "#f59e0b", label: "Gul" },
  { hex: "#8b5cf6", label: "Lilla" },
]

function getLocalDateStr(isoStr: string): string {
  const zoned = toZonedTime(new Date(isoStr), TIMEZONE)
  return format(zoned, "yyyy-MM-dd")
}

function getLocalTimeStr(isoStr: string): string {
  const zoned = toZonedTime(new Date(isoStr), TIMEZONE)
  return format(zoned, "HH:mm")
}

interface EventFormProps {
  event: SerializedEvent | null
  defaultDate: Date
  familyMembers: Member[]
  currentUserId: string
  canEdit: boolean
  onSuccess: () => void
}

export function EventForm({ event, defaultDate, familyMembers, currentUserId, canEdit, onSuccess }: EventFormProps) {
  const [error, setError] = useState<string | null>(null)

  const defaultValues: Partial<FormValues> = event
    ? {
        title: event.title,
        description: event.description ?? "",
        date: getLocalDateStr(event.startTime),
        startTime: event.allDay ? undefined : getLocalTimeStr(event.startTime),
        endTime: event.endTime ? getLocalTimeStr(event.endTime) : undefined,
        allDay: event.allDay ? "true" : "false",
        color: event.color ?? undefined,
        repeats: event.recurrence ? "true" : "false",
        recurrenceType: event.recurrence
          ? (event.recurrence.match(/FREQ=(\w+)/)?.[1]?.toLowerCase() as FormValues["recurrenceType"])
          : undefined,
        attendeeIds: event.attendees.map((a) => a.userId),
      }
    : {
        date: format(defaultDate, "yyyy-MM-dd"),
        allDay: "false",
        repeats: "false",
        attendeeIds: [currentUserId],
      }

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues,
  })

  const [allDay, repeats, selectedColor, attendeeIds] = useWatch({
    control,
    name: ["allDay", "repeats", "color", "attendeeIds"],
  })
  const isAllDay = allDay === "true"
  const doesRepeat = repeats === "true"
  const selectedAttendees = attendeeIds ?? []

  async function onSubmit(data: FormValues) {
    setError(null)
    try {
      await saveEvent(event, data)
      onSuccess()
    } catch {
      setError("Kunne ikke lagre hendelsen. Prøv igjen.")
    }
  }

  function toggleAttendee(userId: string) {
    const current = selectedAttendees
    if (current.includes(userId)) {
      setValue("attendeeIds", current.filter((id) => id !== userId))
    } else {
      setValue("attendeeIds", [...current, userId])
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pt-2">
      {/* Tittel */}
      <div className="space-y-1">
        <label className={labelClass}>Tittel</label>
        <input
          {...register("title")}
          type="text"
          placeholder="Legg til tittel"
          className={inputClass}
          autoFocus
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      {/* Dato */}
      <div className="space-y-1">
        <label className={labelClass}>Dato</label>
        <input {...register("date")} type="date" className={inputClass} />
        {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
      </div>

      {/* Hele dagen */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isAllDay}
          onChange={(e) => setValue("allDay", e.target.checked ? "true" : "false")}
          className="size-4 rounded border-input accent-primary"
        />
        <span className={labelClass}>Hele dagen</span>
      </label>

      {/* Tidspunkt */}
      {!isAllDay && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={labelClass}>Starttidspunkt</label>
            <input {...register("startTime")} type="time" className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Sluttidspunkt</label>
            <input {...register("endTime")} type="time" className={inputClass} />
          </div>
        </div>
      )}

      {/* Beskrivelse */}
      <div className="space-y-1">
        <label className={labelClass}>Beskrivelse (valgfritt)</label>
        <textarea
          {...register("description")}
          placeholder="Legg til beskrivelse"
          rows={2}
          className={cn(inputClass, "h-auto resize-none")}
        />
      </div>

      {/* Farge */}
      <div className="space-y-2">
        <label className={labelClass}>Farge</label>
        <div className="flex gap-3">
          {COLORS.map(({ hex, label }) => (
            <button
              key={hex}
              type="button"
              aria-label={label}
              onClick={() => setValue("color", hex)}
              className={cn(
                "size-8 rounded-full border-2 transition-all",
                selectedColor === hex ? "border-foreground scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>

      {/* Gjentas */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={doesRepeat}
          onChange={(e) => setValue("repeats", e.target.checked ? "true" : "false")}
          className="size-4 rounded border-input accent-primary"
        />
        <span className={labelClass}>Gjentas</span>
      </label>

      {doesRepeat && (
        <div className="space-y-1">
          <label className={labelClass}>Gjentakelse</label>
          <select {...register("recurrenceType")} className={inputClass}>
            <option value="daily">Daglig</option>
            <option value="weekly">Ukentlig</option>
            <option value="monthly">Månedlig</option>
            <option value="yearly">Årlig</option>
          </select>
        </div>
      )}

      {/* Deltakere */}
      {familyMembers.length > 1 && (
        <div className="space-y-2">
          <label className={labelClass}>Deltakere</label>
          <div className="space-y-2">
            {familyMembers.map((member) => (
              <label key={member.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAttendees.includes(member.id)}
                  onChange={() => toggleAttendee(member.id)}
                  className="size-4 rounded border-input accent-primary"
                />
                <span className="text-sm">{member.name ?? member.id}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!canEdit && (
        <p className="text-sm text-muted-foreground">
          Bare den som opprettet hendelsen eller en administrator kan endre den.
        </p>
      )}

      <Button type="submit" className="w-full min-h-[44px]" disabled={!canEdit}>
        {event ? "Lagre" : "Legg til"}
      </Button>
    </form>
  )
}
