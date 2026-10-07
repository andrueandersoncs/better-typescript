import { describe, expect, it } from "vitest"
import { parseQuantity } from "../src/parseQuantity"

type QuantityRequest = {
  readonly input: string
}

describe("parseQuantity", () => {
  it("parses a whole number", () => {
    const request: QuantityRequest = { input: "12" }
    const quantity = parseQuantity(request.input)
    expect(quantity).toBe(12)
  })
})
