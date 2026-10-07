import * as Effect from "effect/Effect"
import * as Schedule from "effect/Schedule"

type InvoiceRequest = {
  readonly customerId: string
  readonly totalCents: number
  readonly idempotencyKey: string
}

class InvoiceSubmissionFailure {
  readonly _tag = "InvoiceSubmissionFailure"
  constructor(readonly cause: unknown) {}
}

type InvoiceGateway = {
  readonly createInvoice: (request: InvoiceRequest) => Effect.Effect<string, InvoiceSubmissionFailure>
  readonly createInvoiceWithKey: (request: InvoiceRequest, key: string) => Effect.Effect<string, InvoiceSubmissionFailure>
}

declare const invoiceGateway: InvoiceGateway

export const createInvoice = (request: InvoiceRequest): Effect.Effect<string, InvoiceSubmissionFailure> =>
  Effect.retry(
    invoiceGateway.createInvoiceWithKey(request, request.idempotencyKey),
    Schedule.recurs(2),
  )

export const invoiceReference = (invoiceId: string): string => `invoice-${invoiceId}`
