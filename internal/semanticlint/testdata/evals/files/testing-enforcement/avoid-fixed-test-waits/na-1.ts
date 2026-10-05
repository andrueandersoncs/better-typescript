import { describe, expect, it } from "vitest"

describe("route names", () => {
  it("joins route segments", () => {
    const segments = ["api", "v2", "projects"]
    const path = `/${segments.join("/")}`

    expect(path).toBe("/api/v2/projects")
  })

  it("preserves an empty segment list", () => {
    const segments: Array<string> = []

    expect(segments.join("/")).toBe("")
  })
})
