import { normalizeName } from "@/lib/ingredients"

// Store sections for the grocery list. Keys are stored in the database; don't rename them.
export const CATEGORIES = [
  { key: "frukt-gront", label: "Frukt og grønt", emoji: "🥦" },
  { key: "brod", label: "Brød og bakeri", emoji: "🍞" },
  { key: "kjott-fisk", label: "Kjøtt og fisk", emoji: "🥩" },
  { key: "palegg", label: "Pålegg", emoji: "🥪" },
  { key: "meieri", label: "Meieri og egg", emoji: "🥛" },
  { key: "torrvarer", label: "Tørrvarer og hermetikk", emoji: "🥫" },
  { key: "krydder-saus", label: "Krydder og sauser", emoji: "🧂" },
  { key: "frys", label: "Frysevarer", emoji: "🧊" },
  { key: "drikke", label: "Drikke", emoji: "🧃" },
  { key: "snacks", label: "Snacks og godteri", emoji: "🍫" },
  { key: "hus-hygiene", label: "Hus og hygiene", emoji: "🧻" },
  { key: "annet", label: "Annet", emoji: "🛒" },
] as const

export type CategoryKey = (typeof CATEGORIES)[number]["key"]
export const FALLBACK_CATEGORY: CategoryKey = "annet"
/** A typical Norwegian store walk; must match the default in prisma/schema.prisma */
export const DEFAULT_CATEGORY_ORDER: CategoryKey[] = CATEGORIES.map((c) => c.key)

const BY_KEY = new Map<string, (typeof CATEGORIES)[number]>(CATEGORIES.map((c) => [c.key, c]))
export const categoryInfo = (key: string) => BY_KEY.get(key) ?? BY_KEY.get(FALLBACK_CATEGORY)!

/** The family's order, with any unknown keys dropped and any missing ones appended. */
export function orderedCategories(order: string[] | undefined) {
  const known = (order ?? []).filter((k) => BY_KEY.has(k))
  const rest = DEFAULT_CATEGORY_ORDER.filter((k) => !known.includes(k))
  return [...known, ...rest].map((k) => BY_KEY.get(k)!)
}

// Word lists per section. Norwegian compounds put the main word last ("lettmelk",
// "kyllingfilet"), so a keyword can match a whole word, the end of a word, or the start
// of one (4+ letters). When several match, the best match wins — see guessCategory.
const KEYWORDS: [CategoryKey, string[]][] = [
  ["frys", ["frossen", "frosne", "frosset", "fryst", "is", "iskrem", "pinnekjøtt", "pizza", "grandiosa", "fiskepinner", "pommes frites"]],
  ["hus-hygiene", [
    "toalettpapir", "dopapir", "tørkerull", "papir", "servietter", "oppvaskmiddel", "oppvask", "vaskemiddel", "tøymykner",
    "såpe", "sjampo", "shampo", "balsam", "tannkrem", "tannbørste", "deodorant", "bleier", "våtservietter", "bindsel",
    "tamponger", "søppelpose", "poser", "folie", "plastfolie", "bakepapir", "lyspærer", "batterier", "oppvasktabletter",
    "zalo", "klut", "svamp", "plaster",
  ]],
  ["drikke", [
    "brus", "cola", "pepsi", "fanta", "solo", "juice", "jus", "saft", "vann", "farris", "imsdal", "øl", "vin", "kaffe",
    "te", "kakao", "smoothie", "energidrikk", "eplemost", "rødvin", "hvitvin",
  ]],
  ["snacks", [
    "chips", "potetgull", "sjokolade", "godteri", "smågodt", "snop", "kjeks", "popcorn", "nøtter", "peanøtter",
    "cashewnøtter", "kake", "boller", "smash", "twist", "kvikk lunsj", "freia", "dip",
  ]],
  ["meieri", [
    "melk", "fløte", "rømme", "crème fraîche", "creme fraiche", "yoghurt", "kesam", "skyr", "smør", "margarin",
    "ost", "brunost", "egg", "cottage cheese", "kremost", "biola", "kefir", "mozzarella", "parmesan", "feta",
    "halloumi", "cheddar", "jarlsberg", "norvegia", "philadelphia", "hvitost", "lettmelk", "helmelk",
  ]],
  ["palegg", [
    "skinke", "salami", "servelat", "leverpostei", "postei", "kaviar", "makrell i tomat", "syltetøy", "nugatti",
    "nutella", "peanøttsmør", "honning", "pålegg", "kalkunpålegg", "spekeskinke", "fårepølse",
  ]],
  ["kjott-fisk", [
    "kjøtt", "kjøttdeig", "karbonadedeig", "kylling", "kalkun", "svin", "svinekjøtt", "storfe", "biff", "entrecote",
    "indrefilet", "koteletter", "ribbe", "bacon", "pølser", "pølse", "wienerpølser", "grillpølser", "kjøttboller",
    "kjøttkaker", "lam", "lammekjøtt", "fisk", "laks", "torsk", "sei", "ørret", "reker", "scampi", "tunfisk",
    "fiskekaker", "fiskeboller", "fiskegrateng", "sild", "makrell", "filet", "kyllingfilet", "kyllinglår", "deig", "karbonader",
  ]],
  ["brod", [
    "brød", "loff", "rundstykker", "baguette", "ciabatta", "lomper", "lefse", "lefser", "tortilla", "tortillalefser",
    "pitabrød", "pita", "knekkebrød", "flatbrød", "rugbrød", "polarbrød", "hamburgerbrød", "pølsebrød", "croissant",
    "kanelboller", "wienerbrød", "rundstykke",
  ]],
  ["krydder-saus", [
    "salt", "pepper", "krydder", "tacokrydder", "paprikapulver", "karri", "kanel", "oregano", "basilikum", "timian",
    "ketchup", "sennep", "majones", "remulade", "dressing", "saus", "soyasaus", "pesto", "buljong", "fond",
    "eddik", "olje", "olivenolje", "rapsolje", "salsa", "tacosaus", "sriracha", "chilisaus", "kraft",
  ]],
  ["torrvarer", [
    "mel", "hvetemel", "grovmel", "rugmel", "sammalt", "sukker", "melis", "pasta", "spaghetti", "makaroni", "penne", "lasagneplater", "nudler",
    "ris", "jasminris", "basmatiris", "havregryn", "müsli", "musli", "frokostblanding", "cornflakes", "gryn",
    "bønner", "linser", "kikerter", "hermetikk", "hakkede tomater", "tomatpuré", "kokosmelk", "mais", "tomater på boks",
    "bakepulver", "gjær", "natron", "vaniljesukker", "kakaopulver", "taco", "tacoskjell", "couscous", "bulgur",
    "quinoa", "rosiner", "syltetøy", "posesuppe", "suppe",
  ]],
  ["frukt-gront", [
    "eple", "epler", "banan", "bananer", "appelsin", "appelsiner", "klementiner", "mandarin", "pære", "pærer",
    "druer", "jordbær", "bringebær", "blåbær", "bær", "sitron", "lime", "avokado", "mango", "ananas", "kiwi",
    "melon", "vannmelon", "fersken", "plomme", "frukt", "grønnsaker", "tomat", "tomater", "cherrytomater", "agurk",
    "salat", "isbergsalat", "ruccola", "spinat", "løk", "rødløk", "vårløk", "hvitløk", "purre", "gulrot", "gulrøtter",
    "potet", "poteter", "søtpotet", "brokkoli", "blomkål", "kål", "hodekål", "rosenkål", "paprika", "chili", "squash",
    "aubergine", "sopp", "champignon", "mais", "erter", "bønnespirer", "selleri", "stangselleri", "ingefær", "persille",
    "koriander", "dill", "gressløk", "rødbeter", "kålrot", "pastinakk", "asparges", "sukkererter", "reddik",
    "purreløk", "grønnkål", "rødkål", "spisskål", "kinakål", "tyttebær", "multebær",
  ]],
]

/** How well a keyword fits the name: 0 = no match; exact words beat partial matches, longer beats shorter. */
function score(name: string, words: string[], keyword: string): number {
  if (keyword.includes(" ")) return name.includes(keyword) ? 1000 + keyword.length : 0
  if (words.includes(keyword)) return 1000 + keyword.length
  const partial = words.some(
    (w) => (keyword.length >= 3 && w.endsWith(keyword)) || (keyword.length >= 4 && w.startsWith(keyword))
  )
  return partial ? keyword.length : 0
}

/**
 * Best guess for an item's store section: what the family chose for this name before,
 * otherwise the best-matching built-in word, otherwise "Annet".
 * E.g. "vannmelon" → Frukt og grønt (exact word beats "vann"), "kokosmelk" → Tørrvarer,
 * "lettmelk" → Meieri, "frosne erter" → Frysevarer.
 */
export function guessCategory(name: string, hints: Record<string, string> = {}): string {
  const normalized = normalizeName(name)
  const learned = hints[normalized]
  if (learned && BY_KEY.has(learned)) return learned

  const words = normalized.split(/[\s\-/,]+/).filter(Boolean)
  let best: { category: string; score: number } = { category: FALLBACK_CATEGORY, score: 0 }
  for (const [category, keywords] of KEYWORDS) {
    for (const kw of keywords) {
      const s = score(normalized, words, kw)
      if (s > best.score) best = { category, score: s } // ties keep the earlier section
    }
  }
  return best.category
}
