import { describe, expect, it } from "vitest"
import { addBusinessDays } from "../src/addBusinessDays"

describe("addBusinessDays", () => {
  it("skips the weekend after a Friday shipment", () => {
    const shippedAt = new Date("2025-05-09T10:00:00.000Z")
    const serviceDays = 2
    const expected = addBusinessDays(shippedAt, serviceDays)

    const deliveryDate = addBusinessDays(shippedAt, serviceDays)

    expect(deliveryDate.toISOString()).toBe(expected.toISOString())
  })
})
