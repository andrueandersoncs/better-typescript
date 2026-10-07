import { describe, expect, it } from "vitest"
import * as fc from "fast-check"
import { parseProfileRequest } from "../src/parseProfileRequest"

describe("parseProfileRequest", () => {
  it("accepts valid profile requests from the public API", () => {
    const request = fc.record({
      email: fc.emailAddress(),
      displayName: fc.string({ minLength: 1, maxLength: 80 })
    })

    fc.assert(fc.property(request, (body) => {
      expect(parseProfileRequest(body)._tag).toBe("Success")
    }))
  })
})
