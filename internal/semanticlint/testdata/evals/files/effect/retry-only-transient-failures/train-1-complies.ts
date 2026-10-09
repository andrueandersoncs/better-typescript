import { Data, Effect, Schedule } from "effect"

export class GatewayUnavailable extends Data.TaggedError("GatewayUnavailable")<{
  readonly status: number
}> {}

export class InvoiceRejected extends Data.TaggedError("InvoiceRejected")<{
  readonly reason: string
}> {}

export class RateLimited extends Data.TaggedError("RateLimited")<{
  readonly retryAfterMs: number
}> {}

type SubmitError = GatewayUnavailable | InvoiceRejected | RateLimited

export interface Invoice {
  readonly id: string
  readonly customerId: string
  readonly totalCents: number
}

declare const postInvoice: (invoice: Invoice) => Effect.Effect<string, SubmitError>

const backoff = Schedule.exponential("200 millis").pipe(
  Schedule.intersect(Schedule.recurs(4)),
)

const isRetryable = (error: SubmitError): boolean =>
  error._tag === "GatewayUnavailable" ||
  error._tag === "RateLimited"

export const submitInvoice = (invoice: Invoice) =>
  postInvoice(invoice).pipe(
    Effect.retry({ schedule: backoff, while: isRetryable }),
    Effect.tap((receipt) => Effect.logInfo(`invoice ${invoice.id} accepted: ${receipt}`)),
  )

export const submitAll = (invoices: ReadonlyArray<Invoice>) =>
  Effect.forEach(invoices, submitInvoice, { concurrency: 4 })
