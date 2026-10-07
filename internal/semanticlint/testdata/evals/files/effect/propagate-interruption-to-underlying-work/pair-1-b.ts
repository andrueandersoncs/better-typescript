import * as Effect from "effect/Effect"

export interface InvoiceDocument {
  readonly invoiceId: string
  readonly html: string
}

export const fetchInvoiceDocument = (invoiceId: string) =>
  Effect.async<InvoiceDocument, Error>((resume, signal) => {
    const request = fetch(`/api/invoices/${invoiceId}`, { signal })

    request.then(
      async (response) => {
        if (!response.ok) {
          resume(Effect.fail(new Error(`Invoice ${invoiceId} was unavailable`)))
          return
        }
        resume(Effect.succeed({ invoiceId, html: await response.text() }))
      },
      (cause) => resume(Effect.fail(cause))
    )
  })

export const invoiceEndpoint = "/api/invoices"
