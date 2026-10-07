import { describe, expect, it } from "vitest"
import * as fc from "fast-check"
import { normalizeSlug } from "../src/normalizeSlug"

describe("normalizeSlug", () => {
  it("does not create uppercase characters", () => {
    const property = fc.property(fc.string(), (title) => {
      return normalizeSlug(title) === normalizeSlug(title).toLowerCase()
    })
    const result = fc.check(property)

    expect(result.failed).toBe(false)
  })
})
