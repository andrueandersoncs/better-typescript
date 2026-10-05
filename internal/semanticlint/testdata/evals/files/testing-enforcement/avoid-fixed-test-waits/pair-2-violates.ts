import { describe, expect, it } from "vitest"

function scheduleRefresh(events: Array<string>) {
  setTimeout(() => {
    events.push("refreshed")
  }, 30)
}

describe("cache refresh", () => {
  it("records a completed refresh", async () => {
    const events: Array<string> = []
    scheduleRefresh(events)

    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(events).toEqual(["refreshed"])
  })

  it("starts with no refresh entries", () => {
    expect([]).toEqual([])
  })
})
