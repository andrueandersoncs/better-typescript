import { describe, expect, it } from "vitest"
import { decodeCursor, encodeCursor, type Cursor } from "../src/cursorCodec"

// Contract: decodeCursor(encodeCursor(c)) is equivalent to c, where two
// cursors are equivalent when they share position and the same set of shards
// (shard order is not significant and is not preserved by the encoding).

const cursor: Cursor = {
  position: 1_204,
  shards: ["eu-2", "us-1", "ap-3"],
}

const sameCursor = (a: Cursor, b: Cursor): boolean =>
  a.position === b.position &&
  a.shards.length === b.shards.length &&
  a.shards.every((shard) => b.shards.includes(shard))

describe("cursor codec", () => {
  it("produces a url-safe token", () => {
    expect(encodeCursor(cursor)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("round trips", () => {
    const decoded = decodeCursor(encodeCursor(cursor))
    expect(sameCursor(decoded, cursor)).toBe(true)
  })

  it("treats reordered shards as the same cursor", () => {
    expect(sameCursor(cursor, { ...cursor, shards: ["us-1", "ap-3", "eu-2"] })).toBe(true)
  })

  it("rejects a truncated token", () => {
    expect(() => decodeCursor(encodeCursor(cursor).slice(0, 4))).toThrow()
  })
})
