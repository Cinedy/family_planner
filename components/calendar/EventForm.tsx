"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { z } from "zod"
import { createEventSchema } from "@/lib/schemas"
import { saveEvent, saveEventOccurrence } from "@/lib/local/mutations"
import { formValuesFromEvent, seriesValuesFromOccurrenceEdit, validateEventForm } from "@/lib/calendar-utils"
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

interface EventFormProps {
  event: SerializedEvent | null
  /** The tapped occurrence when editing a repeating event */
  occurrenceStart: Date | null
  defaultDate: Date
  familyMembers: Member[]
  currentUserId: string
  canEdit: boolean
  onSuccess: () => void
}

export function EventForm({
  event,
  occurrenceStart,
  defaultDate,
  familyMembers,
  currentUserId,
  canEdit,
  onSuccess,
}: EventFormProps) {
  const [error, setError] = useState<string | null>(null)
  // Values waiting for "Bare denne" / "Hele serien"
  const [pending, setPending] = useState<FormValues | null>(null)
  const isSeriesOccurrence = Boolean(event?.recurrence && occurrenceStart)

  const defaultValues: Partial<FormValues> = event
    ? formValuesFromEvent(event, occurrenceStart ?? undefined)
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

  const [allDay, repeats, selectedColor, attendeeIds, date, endDate] = useWatch({
    control,
    name: ["allDay", "repeats", "color", "attendeeIds", "date", "endDate"],
  })
  const isAllDay = allDay === "true"
  const doesRepeat = repeats === "true"
  const selectedAttendees = attendeeIds ?? []
  const [showEndDate, setShowEndDate] = useState(Boolean(defaultValues.endDate))

  async function save(run: () => Promise<void>) {
    try {
      await run()
      onSuccess()
    } catch {
      setError("Kunne ikke lagre hendelsen. Prøv igjen.")
    }
  }

  function onSubmit(data: FormValues) {
    const problem = validateEventForm(data)
    setError(problem)
    if (problem) return
    if (isSeriesOccurrence) setPending(data)
    else void save(() => saveEvent(event, data))
  }

  function saveOnlyThis() {
    if (pending && event && occurrenceStart) void save(() => saveEventOccurrence(event, occurrenceStart, pending))
  }

  function saveWholeSeries() {
    if (pending && event && occurrenceStart) {
      void save(() => saveEvent(event, seriesValuesFromOccurrenceEdit(pending, event, occurrenceStart)))
    }
  }

  function toggleAttendee(userId: string) {
    setValue(
      "attendeeIds",
      selectedAttendees.includes(userId) ? selectedAttendees.filter((id) => id !== userId) : [...selectedAttendees, userId]
    )
  }

  const checkboxClass = "size-4 rounded border-input accent-primary"

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 pt-2">
      {/* Tittel */}
      <div className="space-y-1">
        <label className={labelClass}>Tittel</label>
        <input {...register("title")} type="text" placeholder="Legg til tittel" className={inputClass} autoFocus={!event} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      {/* Dato, og evt. sluttdato */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className={labelClass}>{showEndDate ? "Fra dato" : "Dato"}</label>
          {!showEndDate && (
            <button
              type="button"
              onClick={() => {
                setShowEndDate(true)
                if (!endDate) setValue("endDate", date)
              }}
              className="text-xs text-muted-foreground hover:text-foreground min-h-[32px] px-1"
            >
              + Over flere dager
            </button>
          )}
        </div>
        <input {...register("date")} type="date" className={inputClass} />
        {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
      </div>

      {showEndDate && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className={labelClass}>Til dato</label>
            <button
              type="button"
              onClick={() => {
                setShowEndDate(false)
                setValue("endDate", "")
              }}
              className="text-xs text-muted-foreground hover:text-foreground min-h-[32px] px-1"
            >
              Bare én dag
            </button>
          </div>
          <input {...register("endDate")} type="date" min={date} className={inputClass} />
        </div>
      )}

      {/* Hele dagen */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isAllDay}
          onChange={(e) => setValue("allDay", e.target.checked ? "true" : "false")}
          className={checkboxClass}
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
              aria-pressed={selectedColor === hex}
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
          className={checkboxClass}
        />
        <span className={labelClass}>Gjentas</span>
      </label>

      {doesRepeat && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={labelClass}>Hvor ofte</label>
            <select {...register("recurrenceType")} className={inputClass}>
              <option value="daily">Daglig</option>
              <option value="weekly">Ukentlig</option>
              <option value="monthly">Månedlig</option>
              <option value="yearly">Årlig</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Gjentas til</label>
            <input {...register("repeatUntil")} type="date" min={date} className={inputClass} />
          </div>
          <p className="col-span-2 -mt-1 text-xs text-muted-foreground">La «Gjentas til» stå tom for å gjenta for alltid.</p>
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
                  className={checkboxClass}
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

      {pending ? (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Dette er en gjentakende hendelse. Hva vil du endre?</p>
          <Button type="button" className="w-full min-h-[44px]" onClick={saveOnlyThis}>
            Bare denne
          </Button>
          <Button type="button" variant="outline" className="w-full min-h-[44px]" onClick={saveWholeSeries}>
            Hele serien
          </Button>
          <Button type="button" variant="ghost" className="w-full min-h-[44px]" onClick={() => setPending(null)}>
            Avbryt
          </Button>
        </div>
      ) : (
        <Button type="submit" className="w-full min-h-[44px]" disabled={!canEdit}>
          {event ? "Lagre" : "Legg til"}
        </Button>
      )}
    </form>
  )
}
