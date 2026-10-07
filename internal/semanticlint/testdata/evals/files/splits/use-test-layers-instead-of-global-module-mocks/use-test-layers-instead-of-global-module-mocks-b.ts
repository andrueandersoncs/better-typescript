import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { describe, expect, it } from "vitest"

type ReceiptMailer = {
  readonly sendReceipt: (invoiceId: string) => Effect.Effect<void>
}

const ReceiptMailer = Context.GenericTag<ReceiptMailer>("ReceiptMailer")

const sendInvoiceReceipt = (invoiceId: string): Effect.Effect<void, never, ReceiptMailer> => {
  return Effect.flatMap(ReceiptMailer, (mailer) => mailer.sendReceipt(invoiceId))
}

const TestReceiptMailer = Layer.succeed(ReceiptMailer, {
  sendReceipt: () => Effect.void,
})

describe("invoice receipts", () => {
  it("sends a receipt after payment", async () => {
    const receiptEffect = sendInvoiceReceipt("inv-1")
    const provisionedEffect = Effect.provide(receiptEffect, TestReceiptMailer)
    const exit = await Effect.runPromiseExit(provisionedEffect)
    expect(exit._tag).toBe("Success")
  })
})
