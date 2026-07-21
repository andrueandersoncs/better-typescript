import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import {
  preferFunctionCompositionMatcher,
  type PreferFunctionCompositionAdapterFact,
  type PreferFunctionCompositionFact
} from "@better-typescript/matchers/builtins/preferFunctionComposition"
import { makeBuiltinPolicy } from "../definePolicy.js"

const blockMessage = "Avoid block bodies that only bind a value and thread it into a call."

const blockHint =
  "Use pipe, flow, or Function.compose (or a related Function combinator) so the " +
  "steps compose as an expression instead of a manually threaded local. Do not nest " +
  "the calls."

const adapterMessage = "Avoid unary adapters that project a property into a partial function."

const adapterHint = (typeText: string, propertyName: string, partialText: string) =>
  `Use flow(Struct.get<${typeText}>(${JSON.stringify(propertyName)}), ${partialText}) instead.`

const makePreferFunctionCompositionFindings = (match: Match<PreferFunctionCompositionFact>) => {
  const makeBlockFindings = () => makeFindings(match.target, blockMessage, blockHint, match.fact)

  const makeAdapterFindings = (fact: PreferFunctionCompositionAdapterFact) => {
    const hint = adapterHint(fact.typeText, fact.propertyName, fact.partialText)

    return makeFindings(match.target, adapterMessage, hint, match.fact)
  }

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "block" }, makeBlockFindings),
    EffectMatch.when({ kind: "adapter" }, makeAdapterFindings),
    EffectMatch.exhaustive
  )
}

export const preferFunctionComposition = makeBuiltinPolicy(
  "prefer-function-composition",
  preferFunctionCompositionMatcher,
  Function.constant(makePreferFunctionCompositionFindings)
)
