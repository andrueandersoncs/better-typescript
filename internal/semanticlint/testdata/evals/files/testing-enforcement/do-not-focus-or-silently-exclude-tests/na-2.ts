import { describe, expect, it } from "vitest"

describe("search filters", () => {
  it("normalizes a query", () => {
    const query = "  Ada Lovelace  "
    const normalized = query.trim().toLocaleLowerCase("en-US")

    expect(normalized).toBe("ada lovelace")
  })

  it("keeps an empty query empty", () => {
    const query = ""
    const normalized = query.trim()

    expect(normalized).toBe("")
  })
})
