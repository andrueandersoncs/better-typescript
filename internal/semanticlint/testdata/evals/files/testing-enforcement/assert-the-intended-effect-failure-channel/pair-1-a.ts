import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import { registerAccount } from "../src/registerAccount"

describe("registerAccount", () => {
  it("rejects an address already in use", async () => {
    const program = registerAccount({
      email: "ada@example.com",
      name: "Ada Lovelace"
    })

    await expect(Effect.runPromise(program)).rejects.toThrow()
  })
})
