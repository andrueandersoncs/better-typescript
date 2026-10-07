import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"

export type InvoiceTab = "details" | "history"

export type InvoicePanel = {
  readonly selectedTab: Ref.Ref<InvoiceTab>
  readonly title: string
}

export const createInvoicePanel = (
  initialTab: InvoiceTab
): Effect.Effect<InvoicePanel> =>
  Effect.gen(function* () {
    const selectedTab = yield* Ref.make(initialTab)
    const title = initialTab === "details" ? "Invoice details" : "Invoice history"

    return { selectedTab, title }
  })
