import * as Effect from "effect/Effect"

type Invoice = {
  readonly id: string
}

type InvoiceCursor = {
  readonly readAll: () => ReadonlyArray<Invoice>
  readonly close: () => void
}

class CursorFailure {
  readonly _tag = "CursorFailure"
  constructor(readonly cause: unknown) {}
}

declare const openInvoiceCursor: () => InvoiceCursor

export const acquireInvoiceCursor = (): Effect.Effect<InvoiceCursor, CursorFailure> =>
  Effect.try({
    try: () => openInvoiceCursor(),
    catch: (cause) => new CursorFailure(cause),
  })
