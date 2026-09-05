import type * as Effect from "effect/Effect"
import type * as Client from "effect/unstable/sql/SqlClient"
import type { SqlError } from "effect/unstable/sql/SqlError"
import type * as Statement from "effect/unstable/sql/Statement"

export type TypeId = "~@effect/sql-d1/D1Client"

export interface D1Client extends Client.SqlClient {
  readonly ["~@effect/sql-d1/D1Client"]: TypeId
  readonly batch: <const Statements extends ReadonlyArray<Statement.Statement<unknown>>>(
    statements: Statements,
  ) => Effect.Effect<{
    readonly [Key in keyof Statements]: Statements[Key] extends Statement.Statement<infer Row> ? ReadonlyArray<Row> : never
  }, SqlError>
}
