import { Data, Effect } from "effect"
import { InvoiceRepo } from "./InvoiceRepo"
import { PdfRenderer } from "../pdf/PdfRenderer"
import { BlobStore } from "../storage/BlobStore"

export class InvoiceExportError extends Data.TaggedError("InvoiceExportError")<{
  readonly invoiceId: string
  readonly stage: "load" | "render" | "upload"
  readonly cause?: unknown
}> {}

export const exportInvoice = (invoiceId: string) =>
  Effect.gen(function* () {
    const repo = yield* InvoiceRepo
    const renderer = yield* PdfRenderer
    const blobs = yield* BlobStore

    const invoice = yield* repo.findById(invoiceId).pipe(
      Effect.mapError((cause) => new InvoiceExportError({ invoiceId, stage: "load", cause })),
    )

    const pdf = yield* renderer.render("invoice", invoice).pipe(
      Effect.mapError((cause) => new InvoiceExportError({ invoiceId, stage: "render", cause })),
    )

    const url = yield* blobs.put(`invoices/${invoice.number}.pdf`, pdf).pipe(
      Effect.mapError((cause) => new InvoiceExportError({ invoiceId, stage: "upload", cause })),
    )

    return { invoiceId, url }
  })
