import { Effect, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { applyPaymentEvent, PaymentEvent } from "../src/payment-events.js"
import { makeLedgerState } from "../src/ledger-state.js"

const decodeEvent = Schema.decodeUnknown(Schema.parseJson(PaymentEvent))

describe("applyPaymentEvent", () => {
  it.effect("credits a captured payment", () =>
    Effect.gen(function* () {
      const event = yield* decodeEvent(JSON.stringify({ type: "captured", paymentId: "pay_1", amountCents: 2500 }))
      const state = applyPaymentEvent(makeLedgerState(), event)
      expect(state.balanceCents).toBe(2500)
    })
  )

  it.effect("leaves the ledger untouched for an event without an amount", () =>
    Effect.gen(function* () {
      const event = { type: "captured", paymentId: "pay_2" } as unknown as PaymentEvent
      const state = applyPaymentEvent(makeLedgerState(), event)
      expect(state.balanceCents).toBe(0)
    })
  )
})
