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

  it("accepts the zero boundary", () => {
    const quantity = parseQuantity("0")
    expect(quantity).toBe(0)
  })

  it("rejects nonnumeric input", () => {
    expect(() => parseQuantity("none")).toThrow()
  })
})
