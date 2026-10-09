import { Effect, Context, Layer } from "effect"
import { HttpClient, HttpClientRequest } from "@effect/platform"
import { InvoiceDecodeError, BillingApiError } from "./errors"
import { decodeInvoices, type Invoice } from "./schema"

export interface InvoiceSource {
  readonly listOpen: (accountId: string) => Effect.Effect<ReadonlyArray<Invoice>, BillingApiError>
}
export const InvoiceSource = Context.GenericTag<InvoiceSource>("InvoiceSource")

const fetchOpenInvoices = (client: HttpClient.HttpClient, accountId: string) =>
  client.execute(HttpClientRequest.get(`/accounts/${accountId}/invoices?status=open`)).pipe(
    Effect.flatMap((response) => response.json),
    Effect.flatMap(decodeInvoices),
    Effect.scoped,
  )

export const InvoiceSourceLive = Layer.effect(
  InvoiceSource,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    return {
      listOpen: (accountId) =>
        fetchOpenInvoices(client, accountId).pipe(
          Effect.timeout("5 seconds"),
          Effect.catchAll(() => Effect.succeed([] as ReadonlyArray<Invoice>)),
          Effect.withSpan("InvoiceSource.listOpen", { attributes: { accountId } }),
        ),
    }
  }),
)

export const outstandingTotal = (invoices: ReadonlyArray<Invoice>): number =>
  invoices.reduce((sum, invoice) => sum + invoice.amountDueCents, 0)
