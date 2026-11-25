import type { Member } from "@/types/sync"

/** "Deg", "Deg og Ola", "Ola og Kari", "Deg, Ola og Kari" — "Deg" first. */
export function namesLabel(people: Member[], meId: string): string {
  const names = [...people]
    .sort((a, b) => Number(b.id === meId) - Number(a.id === meId))
    .map((p) => (p.id === meId ? "Deg" : (p.name?.split(" ")[0] ?? "Ukjent")))
  if (names.length <= 1) return names[0] ?? ""
  return `${names.slice(0, -1).join(", ")} og ${names[names.length - 1]}`
}
