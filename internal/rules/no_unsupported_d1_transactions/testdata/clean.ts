import { D1Client } from "@effect/sql-d1"
import { pipe } from "effect/Function"
import type * as Effect from "effect/Effect"
import type { SqlClient } from "effect/unstable/sql/SqlClient"
import type * as Statement from "effect/unstable/sql/Statement"

interface SupportedClient extends SqlClient {
  readonly backend: "supported"
}

interface D1Lookalike extends SqlClient {
  readonly ["~@effect/sql-d1/D1Client"]: "~@effect/sql-d1/D1Client"
}

declare const effect: Effect.Effect<void>
declare const d1: D1Client.D1Client
declare const statement: Statement.Statement<{ readonly id: string }>
declare const supported: SupportedClient
declare const local: D1Lookalike
declare const unrelated: { readonly pipe: (stage: unknown) => unknown }

const inspected = d1.withTransaction
const pipeInspection = pipe(d1.withTransaction)
const erased: SqlClient = d1
erased.withTransaction(effect)
supported.withTransaction(effect)
local.withTransaction(effect)
unrelated.pipe(d1.withTransaction)
d1.batch([statement])
void inspected
void pipeInspection
