import { describe, expect, it } from "vitest"
import * as fc from "fast-check"
import { normalizeCustomerReference } from "../src/normalizeCustomerReference"

describe("normalizeCustomerReference", () => {
  it("normalizes every customer reference", () => {
    const reference = fc.string()

    fc.assert(fc.property(reference, (value) => {
      expect(normalizeCustomerReference(value)).not.toContain(" ")
    }))
  })
})
