import { describe, expect, it } from "vitest"
import { encodeCursor, decodeCursor, type Cursor } from "../src/pagination"

const randomInt = (max: number): number => Math.floor(Math.random() * max)

const randomCursor = (): Cursor => ({
  sortKey: `k${randomInt(1_000_000)}`,
  id: crypto.randomUUID(),
  direction: randomInt(2) === 0 ? "forward" : "backward",
})

describe("pagination cursors", () => {
  it("encodes a known cursor to url-safe text", () => {
    const encoded = encodeCursor({ sortKey: "k42", id: "a1", direction: "forward" })
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("round-trips randomly generated cursors", () => {
    for (let run = 0; run < 200; run++) {
      const cursor = randomCursor()
      const decoded = decodeCursor(encodeCursor(cursor))
      if (decoded.sortKey !== cursor.sortKey || decoded.direction !== cursor.direction) {
        throw new Error("cursor did not round-trip")
      }
    }
  })

  it("rejects tampered input", () => {
    expect(() => decodeCursor("not-a-cursor")).toThrow()
  })
})
