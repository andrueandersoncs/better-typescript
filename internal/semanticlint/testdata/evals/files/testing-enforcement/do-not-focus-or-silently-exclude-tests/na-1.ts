import { describe, expect, it } from "vitest"

describe("postal addresses", () => {
  it("joins populated address lines", () => {
    const lines = ["10 Market Street", undefined, "Portland, OR 97205"]
    const address = lines.filter((line): line is string => line !== undefined).join("\n")

    expect(address).toBe("10 Market Street\nPortland, OR 97205")
  })

  it("omits empty address lines", () => {
    const lines = ["10 Market Street", "", "Portland, OR 97205"]

    expect(lines.filter(Boolean)).toEqual(["10 Market Street", "Portland, OR 97205"])
  })
})
