import { make as makeCache, makeWith as makeCacheWith } from "effect/Cache"
import * as Effect from "effect/Effect"

interface Client { readonly id: string }
declare const acquireClient: (key: string) => Effect.Effect<Client>

const direct = makeCache({
  lookup: (key: string) =>
    Effect.acquireRelease(acquireClient(key), () => Effect.succeed<void>(undefined))
})

const positional = makeCacheWith(
  (key: string) => Effect.acquireRelease(acquireClient(key), () => Effect.succeed<void>(undefined)),
  { capacity: 1 }
)

const generated = makeCache({
  lookup: (key: string) => Effect.gen(function*() {
    return yield* Effect.acquireRelease(acquireClient(key), () => Effect.succeed<void>(undefined))
  })
})

void direct
void positional
void generated
