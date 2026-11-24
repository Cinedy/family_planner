"use client"

import { useState } from "react"
import { Check, Copy, Link2, Share } from "lucide-react"
import { createInvitation } from "@/app/actions/family"
import { Button } from "@/components/ui/button"

export function InviteForm({ familyName }: { familyName: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== "undefined" && "share" in navigator

  async function handleCreate() {
    setPending(true)
    setError(null)
    try {
      const result = await createInvitation()
      if (result.token) setLink(`${window.location.origin}/invite/${result.token}`)
      else setError(result.error ?? "Kunne ikke lage invitasjon. Prøv igjen.")
    } catch {
      setError("Du må være på nett for å lage en invitasjon.")
    } finally {
      setPending(false)
    }
  }

  async function handleShare() {
    if (!link) return
    try {
      await navigator.share({
        title: "Familieplanlegger",
        text: `Bli med i ${familyName} på Familieplanleggeren:`,
        url: link,
      })
    } catch {
      // Closing the share sheet throws; nothing to do
    }
  }

  async function handleCopy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Kunne ikke kopiere. Marker lenken og kopier den manuelt.")
    }
  }

  if (!link) {
    return (
      <div className="space-y-2">
        <Button className="w-full min-h-[44px] gap-2" onClick={handleCreate} disabled={pending}>
          <Link2 className="size-4" />
          {pending ? "Lager lenke…" : "Lag invitasjonslenke"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="select-all break-all rounded-md border border-border bg-muted/50 px-3 py-2 text-xs">{link}</p>
      <div className="flex gap-2">
        {canShare && (
          <Button className="flex-1 min-h-[44px] gap-2" onClick={handleShare}>
            <Share className="size-4" />
            Del lenke
          </Button>
        )}
        <Button variant={canShare ? "outline" : "default"} className="flex-1 min-h-[44px] gap-2" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Kopiert" : "Kopier"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Lenken kan brukes av én person og varer i 7 dager. Send en ny lenke til hver person.
      </p>
      <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setLink(null)}>
        Lag en ny lenke
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
