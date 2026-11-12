// Helpers for turning recipe ingredient lines ("400 g kjøttdeig") into grocery items.

const UNITS = [
  "g", "gram", "kg", "hg", "mg",
  "l", "liter", "dl", "cl", "ml",
  "ss", "ts", "krm", "kopp", "kopper",
  "stk", "pk", "pakke", "pakker", "pose", "poser", "boks", "bokser", "glass", "flaske", "flasker",
  "fedd", "neve", "never", "klype", "skive", "skiver", "bunt", "beger", "brett", "porsjon", "porsjoner",
]

// Leading amount: 400, 1,5, 1.5, 1/2, ½, 1-2 … optionally followed by a unit
const AMOUNT = String.raw`(?:\d+(?:[.,]\d+)?(?:\s*[-–/]\s*\d+(?:[.,]\d+)?)?|[½¼¾⅓⅔])`
const PATTERN = new RegExp(`^(${AMOUNT}(?:\\s*(?:${UNITS.join("|")})\\.?)?)\\s+(.+)$`, "i")

export type ParsedIngredient = { name: string; quantity: string | null }

export function parseIngredient(line: string): ParsedIngredient {
  const text = line.trim().replace(/\s+/g, " ")
  const match = text.match(PATTERN)
  if (!match) return { name: text, quantity: null }
  return { name: match[2], quantity: match[1] }
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

/** True for basics like "salt" — and "salt og pepper" when every part is a basic. */
export function isStaple(name: string, staples: string[]): boolean {
  const set = new Set(staples.map(normalizeName))
  const parts = normalizeName(name).split(/\s*(?:,|\bog\b|&)\s*/).filter(Boolean)
  return parts.length > 0 && parts.every((part) => set.has(part))
}

/** "Textarea text" ⇄ ingredient list */
export const ingredientsFromText = (text: string) =>
  text.split("\n").map((l) => l.trim()).filter(Boolean)
export const ingredientsToText = (ingredients: string[] | undefined) => (ingredients ?? []).join("\n")
