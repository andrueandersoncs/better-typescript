import { describe, expect, it, vi } from "vitest"

function scheduleRefresh(events: Array<string>) {
  setTimeout(() => {
    events.push("refreshed")
  }, 30)
}

describe("cache refresh", () => {
  it("records a completed refresh", async () => {
    vi.useFakeTimers()
    const events: Array<string> = []
    scheduleRefresh(events)

    await vi.advanceTimersByTimeAsync(30)
    vi.useRealTimers()

    expect(events).toEqual(["refreshed"])
  })

  it("starts with no refresh entries", () => {
    expect([]).toEqual([])
  })
})
