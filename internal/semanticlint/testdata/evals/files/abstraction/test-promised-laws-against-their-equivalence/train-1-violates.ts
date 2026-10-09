import { describe, expect, it } from "vitest"
import { normalizePostalCode } from "./normalizePostalCode"

// normalizePostalCode is documented as idempotent: applying it twice
// yields the same result as applying it once, for any input.

describe("normalizePostalCode", () => {
  it("uppercases Canadian codes and inserts the space", () => {
    expect(normalizePostalCode("k1a0b1", "CA")).toBe("K1A 0B1")
  })

  it("strips the US ZIP+4 suffix", () => {
    expect(normalizePostalCode("94105-1804", "US")).toBe("94105")
  })

  it("trims surrounding whitespace", () => {
    expect(normalizePostalCode("  SW1A 1AA ", "GB")).toBe("SW1A 1AA")
  })

  it("is idempotent", () => {
    expect(normalizePostalCode("K1A 0B1", "CA")).toBe("K1A 0B1")
  })
})
