import { describe, expect, it } from "vitest"
import { namesLabel } from "./people"

const p = (id: string, name: string) => ({ id, name, image: null })

describe("namesLabel", () => {
  it("puts you first as «Deg» and joins with «og»", () => {
    expect(namesLabel([p("me", "Silje Melling")], "me")).toBe("Deg")
    expect(namesLabel([p("ola", "Ola Nordmann"), p("me", "Silje")], "me")).toBe("Deg og Ola")
    expect(namesLabel([p("ola", "Ola"), p("kari", "Kari")], "me")).toBe("Ola og Kari")
    expect(namesLabel([p("ola", "Ola"), p("me", "Silje"), p("kari", "Kari")], "me")).toBe("Deg, Ola og Kari")
    expect(namesLabel([], "me")).toBe("")
  })
})
