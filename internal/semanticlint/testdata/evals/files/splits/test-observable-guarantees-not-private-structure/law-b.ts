import { describe, expect, it } from "vitest"
import { normalizeTag } from "../src/normalizeTag"

type TaggedItem = {
  readonly tag: string
}

describe("normalizeTag", () => {
  it("is stable after normalization", () => {
    const item: TaggedItem = { tag: "  SALE  " }
    const normalized = normalizeTag(item.tag)
    const repeated = normalizeTag(normalized)
    expect(repeated).toBe(normalized)
  })

  it("preserves an empty tag", () => {
    const tag = normalizeTag("")
    expect(tag).toBe("")
  })
})
