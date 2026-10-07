import { describe, it } from "vitest"
import * as fc from "fast-check"
import { normalizeSlug } from "../src/normalizeSlug"

describe("normalizeSlug", () => {
  it("does not create uppercase characters", () => {
    const property = fc.property(fc.string(), (title) => {
      return normalizeSlug(title) === normalizeSlug(title).toLowerCase()
    })

    fc.check(property)
  })
})
