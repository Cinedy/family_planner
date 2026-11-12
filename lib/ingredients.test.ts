import { describe, expect, it } from "vitest"
import { ingredientsFromText, ingredientsToText, isStaple, parseIngredient } from "./ingredients"

describe("parseIngredient", () => {
  it.each([
    ["400 g kjøttdeig", "400 g", "kjøttdeig"],
    ["1 løk", "1", "løk"],
    ["2 fedd hvitløk", "2 fedd", "hvitløk"],
    ["1 boks hakkede tomater", "1 boks", "hakkede tomater"],
    ["1,5 dl fløte", "1,5 dl", "fløte"],
    ["½ ts salt", "½ ts", "salt"],
    ["2-3 gulrøtter", "2-3", "gulrøtter"],
    ["1 pakke tortillalefser", "1 pakke", "tortillalefser"],
  ])("splits %j into quantity and name", (line, quantity, name) => {
    expect(parseIngredient(line)).toEqual({ quantity, name })
  })

  it("keeps lines without an amount as the name", () => {
    expect(parseIngredient("tacokrydder")).toEqual({ quantity: null, name: "tacokrydder" })
    expect(parseIngredient("  salt   og  pepper ")).toEqual({ quantity: null, name: "salt og pepper" })
  })
})

describe("isStaple", () => {
  const staples = ["salt", "pepper", "olje", "Olivenolje"]

  it("matches basics regardless of case", () => {
    expect(isStaple("salt", staples)).toBe(true)
    expect(isStaple("OLIVENOLJE", staples)).toBe(true)
  })

  it("matches combined basics only when every part is a basic", () => {
    expect(isStaple("salt og pepper", staples)).toBe(true)
    expect(isStaple("salt, pepper", staples)).toBe(true)
    expect(isStaple("salt og sukker", staples)).toBe(false)
  })

  it("does not match ingredients that merely contain a basic", () => {
    expect(isStaple("saltede peanøtter", staples)).toBe(false)
    expect(isStaple("", staples)).toBe(false)
  })
})

describe("ingredient text", () => {
  it("round-trips and drops blank lines", () => {
    const list = ingredientsFromText("400 g kjøttdeig\n\n  1 løk  \n")
    expect(list).toEqual(["400 g kjøttdeig", "1 løk"])
    expect(ingredientsToText(list)).toBe("400 g kjøttdeig\n1 løk")
    expect(ingredientsToText(undefined)).toBe("")
  })
})
