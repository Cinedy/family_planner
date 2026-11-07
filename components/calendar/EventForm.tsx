"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { z } from "zod"
import { createEventSchema } from "@/lib/schemas"
import { createEvent, updateEvent } from "@/app/actions/calendar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SerializedEvent, FamilyMemberForCalendar } from "@/types/calendar"

type FormValues = z.infer<typeof createEventSchema>

const COLORS = [
  { hex: "#3b82f6", label: "Blå" },
  { hex: "#ef4444", label: "Rød" },
  { hex: "#22c55e", label: "Grønn" },
  { hex: "#f59e0b", label: "Gul" },
  { hex: "#8b5cf6", label: "Lilla" },
]

const TIMEZONE = "Europe/Oslo"

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
  familyMembers: FamilyMemberForCalendar[]
  currentUserId: string
  onSuccess: () => void
}

export function EventForm({ event, defaultDate, familyMembers, currentUserId, onSuccess }: EventFormProps) {
  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

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

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues,
  })

  const isAllDay = watch("allDay") === "true"
  const doesRepeat = watch("repeats") === "true"
  const selectedColor = watch("color")
  const selectedAttendees = watch("attendeeIds") ?? []

  async function onSubmit(data: FormValues) {
    setIsPending(true)
    setServerError(null)

    const fd = new FormData()
    if (event) fd.append("id", event.id)
    fd.append("title", data.title)
    if (data.description) fd.append("description", data.description)
    fd.append("date", data.date)
    fd.append("allDay", data.allDay ?? "false")
    if (data.startTime) fd.append("startTime", data.startTime)
    if (data.endTime) fd.append("endTime", data.endTime)
    if (data.color) fd.append("color", data.color)
    fd.append("repeats", data.repeats ?? "false")
    if (data.recurrenceType) fd.append("recurrenceType", data.recurrenceType)
    for (const id of data.attendeeIds ?? []) fd.append("attendeeIds", id)

    const action = event ? updateEvent : createEvent
    const result = await action(null, fd)

    setIsPending(false)
    if (result.error) {
      setServerError(result.error)
    } else if (!result.fieldErrors) {
      onSuccess()
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

  const inputClass = "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  const labelClass = "text-sm font-medium text-foreground"

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

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
        {isPending ? "Lagrer..." : event ? "Lagre" : "Legg til"}
      </Button>
    </form>
  )
}
