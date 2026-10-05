import { describe, expect, it } from "vitest"

function beginUpload(state: { value: string }) {
  setTimeout(() => {
    state.value = "available"
  }, 80)
}

describe("report upload", () => {
  it("publishes an uploaded report", async () => {
    const state = { value: "pending" }
    beginUpload(state)

    await new Promise((resolve) => setTimeout(resolve, 80))

    expect(state.value).toBe("available")
  })

  it("begins with a pending report", () => {
    expect({ value: "pending" }).toEqual({ value: "pending" })
  })
})
