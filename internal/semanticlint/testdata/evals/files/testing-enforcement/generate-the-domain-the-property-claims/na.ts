import { describe, expect, it } from "vitest"
import { deliveryWindowLabel } from "../src/deliveryWindowLabel"

describe("deliveryWindowLabel", () => {
  it("shows the morning window in local time", () => {
    const window = {
      startsAt: "09:00",
      endsAt: "12:00",
      timeZone: "America/New_York"
    }

    expect(deliveryWindowLabel(window)).toBe("9:00 AM–12:00 PM")
  })
})
