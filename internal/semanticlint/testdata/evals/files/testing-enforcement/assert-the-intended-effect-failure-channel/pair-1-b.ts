import { describe, expect, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import { registerAccount } from "../src/registerAccount"

describe("registerAccount", () => {
  it("rejects an address already in use", async () => {
    const program = registerAccount({
      email: "ada@example.com",
      name: "Ada Lovelace"
    })
    const exit = await Effect.runPromiseExit(program)

    expect(Exit.isFailure(exit)).toBe(true)
    expect(Cause.failureOption(exit.cause)).toEqual(Option.some({ _tag: "EmailAlreadyRegistered" }))
  })
})
