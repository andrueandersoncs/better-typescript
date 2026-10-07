import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import { waitForWorker } from "../src/waitForWorker"

describe("waitForWorker", () => {
  it("stops when its parent request is cancelled", async () => {
    const worker = waitForWorker("worker-19").pipe(
      Effect.interrupt
    )

    await expect(Effect.runPromise(worker)).rejects.toThrow()
  })
})
