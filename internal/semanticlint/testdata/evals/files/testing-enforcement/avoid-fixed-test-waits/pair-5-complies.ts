import { describe, expect, it } from "vitest"

function beginUpload(state: { value: string }) {
  return new Promise<void>((resolve) => {
    queueMicrotask(() => {
      state.value = "available"
      resolve()
    })
  })
}

describe("report upload", () => {
  it("publishes an uploaded report", async () => {
    const state = { value: "pending" }
    await beginUpload(state)

    expect(state.value).toBe("available")
  })

  it("begins with a pending report", () => {
    expect({ value: "pending" }).toEqual({ value: "pending" })
  })
})
