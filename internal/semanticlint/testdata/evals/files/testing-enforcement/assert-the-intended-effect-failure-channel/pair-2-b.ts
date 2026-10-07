import { describe, expect, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import { capturePayment } from "../src/capturePayment"

describe("capturePayment", () => {
  it("returns the issuer decline for an expired card", async () => {
    const payment = capturePayment({
      amount: 4100,
      cardToken: "card_expired"
    })
    const exit = await Effect.runPromiseExit(payment)

    expect(Exit.isFailure(exit)).toBe(true)
    expect(Cause.failureOption(exit.cause)).toEqual(Option.some({ _tag: "CardExpired" }))
  })
})
