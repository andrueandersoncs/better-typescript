import * as Effect from "effect/Effect"

type ReceiptId = string

type ReceiptFailure = Readonly<{
  message: string
}>

type ReceiptRequest = Readonly<{
  address: string
}>

type Mailer = Readonly<{
  send: (address: string) => Effect.Effect<ReceiptId, ReceiptFailure>
}>

export type SendReceipt = (
  request: ReceiptRequest,
) => Effect.Effect<ReceiptId, ReceiptFailure>

export const sendReceipt = (mailer: Mailer): SendReceipt => (request) =>
  mailer.send(request.address)
