import { describe, expect, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { waitForWorker } from "../src/waitForWorker"

describe("waitForWorker", () => {
  it("stops when its parent request is cancelled", async () => {
    const worker = waitForWorker("worker-19").pipe(
      Effect.interrupt
    )
    const exit = await Effect.runPromiseExit(worker)

    expect(Exit.isFailure(exit)).toBe(true)
    expect(Cause.isInterruptedOnly(exit.cause)).toBe(true)
  })
})
