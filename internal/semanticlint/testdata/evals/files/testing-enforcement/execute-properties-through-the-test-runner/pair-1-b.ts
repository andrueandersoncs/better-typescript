import { describe, it } from "vitest"
import * as fc from "fast-check"
import { encodeCursor, decodeCursor } from "../src/cursor"

describe("cursor codec", () => {
  it("round-trips page offsets", () => {
    const property = fc.property(
      fc.integer({ min: 0, max: 10_000 }),
      (offset) => decodeCursor(encodeCursor(offset)) === offset
    )

    fc.assert(property)
  })
})
