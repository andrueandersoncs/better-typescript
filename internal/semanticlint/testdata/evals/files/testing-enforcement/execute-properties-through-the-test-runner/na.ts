import { describe, expect, it } from "vitest"
import { isValidLocale } from "../src/isValidLocale"

describe("isValidLocale", () => {
  it("accepts the configured fallback locale", () => {
    const fallback = "en-US"
    const source = {
      locale: fallback,
      currency: "USD"
    }

    expect(isValidLocale(source.locale)).toBe(true)
  })
})
