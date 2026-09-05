import type * as Effect from "effect/Effect"
import type { SqlError } from "effect/unstable/sql/SqlError"

export interface Statement<A> extends Effect.Effect<ReadonlyArray<A>, SqlError> {}
