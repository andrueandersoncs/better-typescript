import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import { makeBuiltinPolicy } from "../definePolicy.js"
import {
  noRawObjectTypesMatcher,
  type NoRawObjectTypesFact
} from "@better-typescript/matchers/builtins/noRawObjectTypes"

const parameterMessage = "Parameter uses an anonymous object type instead of a named type."

const parameterHint =
  "Reuse a named data structure that already expresses this value's semantics. " +
  "If none exists, reconsider whether this function is a real abstraction or a " +
  "procedural seam that should be collapsed into its owner. Introduce a new model " +
  "only when the data has meaning independent of this parameter list; never replace " +
  "it with another anonymous object type."

const returnMessage = "Return type uses an anonymous object type instead of a named type."

const returnHint =
  "Define a named type or interface that describes the data's domain meaning — " +
  "for example UserProfile instead of { name: string, age: number }. " +
  "Name the type after what the data represents, not its structural role " +
  "(avoid names like FooResult or BarResponse)."

const makeNoRawObjectTypesFindings = (match: Match<NoRawObjectTypesFact>) => {
  const makeParameterFindings = () =>
    makeFindings(match.target, parameterMessage, parameterHint, undefined)

  const makeReturnFindings = () => makeFindings(match.target, returnMessage, returnHint, undefined)

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "parameter" }, makeParameterFindings),
    EffectMatch.when({ kind: "return" }, makeReturnFindings),
    EffectMatch.exhaustive
  )
}

export const noRawObjectTypes = makeBuiltinPolicy(
  "no-raw-object-types",
  noRawObjectTypesMatcher,
  Function.constant(makeNoRawObjectTypesFindings)
)
