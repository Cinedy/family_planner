import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Member } from "@/types/sync"

/** Overlapping avatars for several people (e.g. who a to-do is assigned to). */
export function AvatarStack({ people, className, max = 3 }: { people: Member[]; className?: string; max?: number }) {
  if (people.length === 0) return null
  return (
    <span className="flex -space-x-1.5 shrink-0">
      {people.slice(0, max).map((p) => (
        <PersonAvatar key={p.id} person={p} className={cn("ring-1 ring-background", className)} />
      ))}
      {people.length > max && (
        <span className={cn("size-5 rounded-full bg-muted flex items-center justify-center text-[10px] ring-1 ring-background", className)}>
          +{people.length - max}
        </span>
      )}
    </span>
  )
}

/** Small round picture of a family member, with their initial as a fallback. */
export function PersonAvatar({ person, className }: { person: Member; className?: string }) {
  return (
    <Avatar className={cn("size-5 after:border-background", className)}>
      {person.image && <AvatarImage src={person.image} alt={person.name ?? ""} />}
      <AvatarFallback className="text-[10px] font-medium text-foreground">
        {(person.name?.[0] ?? "?").toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}
