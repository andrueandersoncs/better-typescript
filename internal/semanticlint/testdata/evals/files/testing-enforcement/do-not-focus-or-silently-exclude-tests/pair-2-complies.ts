import { describe, expect, it } from "vitest"

describe("account summary", () => {
  it("adds incoming transfers", () => {
    const opening = 420
    const transfers = [75, 125]

    expect(transfers.reduce((total, value) => total + value, opening)).toBe(620)
  })

  it("subtracts outgoing transfers", () => {
    expect(620 - 80).toBe(540)
  })

  it("returns the opening balance without transfers", () => {
    expect([].reduce((total, value) => total + value, 420)).toBe(420)
  })
})
