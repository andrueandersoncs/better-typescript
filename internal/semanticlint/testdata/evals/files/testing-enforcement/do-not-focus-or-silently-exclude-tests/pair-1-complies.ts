import { describe, expect, it } from "vitest"

describe("currency display", () => {
  it("renders a negative balance", () => {
    const amount = -1250
    const rendered = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)

    expect(rendered).toBe("-$12.50")
  })

  it("renders a zero balance", () => {
    expect(new Intl.NumberFormat("en-US").format(0)).toBe("0")
  })

  it("renders a whole-dollar balance", () => {
    expect(new Intl.NumberFormat("en-US").format(25)).toBe("25")
  })
})
