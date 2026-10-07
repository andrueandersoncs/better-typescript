import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import { capturePayment } from "../src/capturePayment"

describe("capturePayment", () => {
  it("returns the issuer decline for an expired card", async () => {
    const payment = capturePayment({
      amount: 4100,
      cardToken: "card_expired"
    })

    await expect(Effect.runPromise(payment)).rejects.toBeDefined()
  })
})
