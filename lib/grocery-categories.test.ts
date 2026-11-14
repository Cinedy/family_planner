import { describe, expect, it } from "vitest"
import { DEFAULT_CATEGORY_ORDER, guessCategory, orderedCategories } from "./grocery-categories"

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
