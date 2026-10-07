import * as Effect from "effect/Effect"

type ReceiptId = string

type ReceiptFailure = Readonly<{
  message: string
}>

type Mailer = Readonly<{
  send: (address: string) => Effect.Effect<ReceiptId, ReceiptFailure>
}>

export const sendReceipt = (mailer: Mailer, address: string) =>
  mailer.send(address)
