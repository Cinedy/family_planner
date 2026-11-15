import { describe, expect, it } from "vitest"
import { DEFAULT_CATEGORY_ORDER, groupBySection, guessCategory, orderedCategories } from "./grocery-categories"

describe("guessCategory", () => {
  it.each([
    ["melk", "meieri"],
    ["lettmelk", "meieri"], // compound: main word last
    ["Kremfløte", "meieri"],
    ["kokosmelk", "torrvarer"], // exact word beats the "melk" ending
    ["vannmelon", "frukt-gront"], // exact word beats the "vann" start
    ["eplejuice", "drikke"], // longer match ("juice") beats "eple"
    ["frosne erter", "frys"], // both whole words; the longer "frosne" wins
    ["hakkede tomater", "torrvarer"],
    ["kyllingfilet", "kjott-fisk"],
    ["svin", "kjott-fisk"], // not "vin"
    ["grovbrød", "brod"],
    ["is", "frys"],
    ["te", "drikke"],
    ["toalettpapir", "hus-hygiene"],
    ["tacokrydder", "krydder-saus"],
    ["noe helt ukjent", "annet"],
  ])("%j → %s", (name, category) => {
    expect(guessCategory(name)).toBe(category)
  })

  it("prefers what the family chose before", () => {
    expect(guessCategory("Pizzadeig", { pizzadeig: "meieri" })).toBe("meieri")
  })

  it("ignores a learned section that doesn't exist", () => {
    expect(guessCategory("melk", { melk: "gammel-kategori" })).toBe("meieri")
  })
})

describe("orderedCategories", () => {
  it("uses the family's order and appends sections it doesn't mention", () => {
    const keys = orderedCategories(["meieri", "ukjent", "brod"]).map((c) => c.key)
    expect(keys.slice(0, 2)).toEqual(["meieri", "brod"])
    expect(keys).toHaveLength(DEFAULT_CATEGORY_ORDER.length)
    expect(new Set(keys)).toEqual(new Set(DEFAULT_CATEGORY_ORDER))
  })
})

describe("groupBySection", () => {
  const item = (name: string, sortOrder: number, category: string | null = null) => ({
    name,
    category,
    sortOrder,
    createdAt: "2026-11-15T10:00:00.000Z",
  })

  it("groups in the family's store order and keeps the drag order inside a section", () => {
    const sections = groupBySection(
      [item("Såpe", 0), item("Bananer", 3), item("Melk", 1), item("Epler", 2)],
      ["meieri", "frukt-gront"],
      {}
    )
    expect(sections.map((s) => [s.category.key, s.items.map((i) => i.name)])).toEqual([
      ["meieri", ["Melk"]],
      ["frukt-gront", ["Epler", "Bananer"]],
      ["hus-hygiene", ["Såpe"]],
    ])
  })

  it("uses a stored section over the guess", () => {
    expect(groupBySection([item("Melk", 0, "annet")], [], {})[0].category.key).toBe("annet")
  })
})
