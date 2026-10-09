import { describe, expect, it } from "vitest"
import { tokenize } from "./tokenizer"

describe("tokenize", () => {
  it("splits on whitespace", () => {
    expect(tokenize("red running shoes")).toEqual(["red", "running", "shoes"])
  })

  it("lowercases tokens", () => {
    expect(tokenize("Nike AIR")).toEqual(["nike", "air"])
  })

  it("drops punctuation", () => {
    expect(tokenize("shoes, socks & laces!")).toEqual(["shoes", "socks", "laces"])
  })

  // tokenize has no dictionary segmenter yet; CJK input is returned as one token (SEARCH-412).
  it.skip("segments CJK text into words", () => {
    expect(tokenize("東京タワー")).toEqual(["東京", "タワー"])
  })

  it("keeps hyphenated words together", () => {
    expect(tokenize("t-shirt")).toEqual(["t-shirt"])
  })
})
