import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

type JournalEntry = { readonly account: string; readonly amount: number }

interface LedgerClient {
  readonly insert: (entry: JournalEntry) => Effect.Effect<void>
}

export const Journal = Context.Service<{
  readonly record: (client: LedgerClient, entry: JournalEntry) => Effect.Effect<void>
}>("Journal")

export const JournalLive = Layer.effect(Journal, Effect.gen(function*() {
  const ledger = yield* Context.Service<LedgerClient>("Ledger")
  return { record: (_client: LedgerClient, entry: JournalEntry) => ledger.insert(entry) }
}))
