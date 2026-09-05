import { D1Client as D1 } from "@effect/sql-d1"
import { pipe } from "effect/Function"
import type * as Effect from "effect/Effect"

declare const effect: Effect.Effect<void>
declare const d1: D1.D1Client
d1.withTransaction(effect)
const alias = d1
alias.withTransaction(effect)
effect.pipe(d1.withTransaction)
pipe(effect, d1.withTransaction)
