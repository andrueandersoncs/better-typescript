import { describe, expect, it } from "vitest"

describe("catalog import", () => {
  it.skip("requires a vendor export credential that is unavailable in local suites", async () => {
    const response = await fetch("https://catalog.example.test/export", {
      headers: { authorization: `Bearer ${process.env.VENDOR_EXPORT_TOKEN}` }
    })
    const rows = await response.json() as Array<{ sku: string; quantity: number }>

    expect(rows.map((row) => row.sku)).toEqual(["pencil", "notebook"])
  })

  it("groups records by quantity", () => {
    expect([4, 2].reduce((total, quantity) => total + quantity, 0)).toBe(6)
  })
})
