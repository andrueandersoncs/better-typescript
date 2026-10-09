import { describe, expect, it } from "vitest"
import fc from "fast-check"
import { slugify } from "./slug"

describe("slugify", () => {
  it("lowercases ascii words and joins them with dashes", () => {
    expect(slugify("Hello World")).toBe("hello-world")
  })

  it("drops leading and trailing separators", () => {
    expect(slugify("  --Draft Post--  ")).toBe("draft-post")
  })

  it("produces only url-safe characters for any string", () => {
    fc.assert(
      fc.property(fc.string({ unit: "binary" }), (input) => {
        expect(slugify(input)).toMatch(/^[a-z0-9-]*$/)
      }),
    )
  })

  it("is idempotent", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const once = slugify(input)
        expect(slugify(once)).toBe(once)
      }),
    )
  })
})
