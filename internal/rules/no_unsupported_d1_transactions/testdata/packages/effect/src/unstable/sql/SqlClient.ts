import type * as Effect from "effect/Effect"
import type { SqlError } from "effect/unstable/sql/SqlError"

export interface SqlClient {
  readonly withTransaction: <R, E, A>(
    self: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E | SqlError, R>
}
