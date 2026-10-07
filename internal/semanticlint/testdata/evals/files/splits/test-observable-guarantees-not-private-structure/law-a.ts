import { describe, expect, it } from "vitest"
import { normalizeTag } from "../src/normalizeTag"

type TaggedItem = {
  readonly tag: string
}

describe("normalizeTag", () => {
  it("formats a tag", () => {
    const item: TaggedItem = { tag: "  SALE  " }
    const tag = normalizeTag(item.tag)
    expect(tag).toBe("sale")
  })

  it("preserves an empty tag", () => {
    const tag = normalizeTag("")
    expect(tag).toBe("")
  })
})
