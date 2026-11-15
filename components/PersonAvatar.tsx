import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Member } from "@/types/sync"

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
