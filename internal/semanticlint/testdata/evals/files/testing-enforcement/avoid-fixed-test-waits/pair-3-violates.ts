import { describe, expect, it } from "vitest"

function createBatch() {
  return {
    status: "queued" as "queued" | "complete",
    begin() {
      queueMicrotask(() => {
        this.status = "complete"
      })
    }
  }
}

describe("batch processing", () => {
  it("finishes a submitted batch", async () => {
    const batch = createBatch()
    batch.begin()

    await Bun.sleep(25)

    expect(batch.status).toBe("complete")
  })

  it("uses a queued initial status", () => {
    expect(createBatch().status).toBe("queued")
  })
})
