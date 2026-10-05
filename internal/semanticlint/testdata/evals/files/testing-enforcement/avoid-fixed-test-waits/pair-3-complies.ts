import { describe, expect, it } from "vitest"

function createBatch() {
  let status: "queued" | "complete" = "queued"

  return {
    get status() {
      return status
    },
    begin() {
      return new Promise<void>((resolve) => {
        queueMicrotask(() => {
          status = "complete"
          resolve()
        })
      })
    }
  }
}

describe("batch processing", () => {
  it("finishes a submitted batch", async () => {
    const batch = createBatch()
    await batch.begin()

    expect(batch.status).toBe("complete")
  })

  it("uses a queued initial status", () => {
    expect(createBatch().status).toBe("queued")
  })
})
