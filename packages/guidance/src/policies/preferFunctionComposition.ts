import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import {
  preferFunctionCompositionMatcher,
  type PreferFunctionCompositionAdapterFact,
  type PreferFunctionCompositionFact
} from "@better-typescript/matchers/builtins/preferFunctionComposition"
import { defineBuiltinPolicy } from "../definePolicy.js"

const blockMessage = "Avoid block bodies that only bind a value and thread it into a call."

const blockHint =
  "Use pipe, flow, or Function.compose (or a related Function combinator) so the " +
  "steps compose as an expression instead of a manually threaded local. Do not nest " +
  "the calls."

const adapterMessage = "Avoid unary adapters that project a property into a partial function."

const adapterHint = (typeText: string, propertyName: string, partialText: string) =>
  `Use flow(Struct.get<${typeText}>(${JSON.stringify(propertyName)}), ${partialText}) instead.`

const preferFunctionCompositionFindings = (match: Match<PreferFunctionCompositionFact>) => {
  const blockFindings = () => oneFinding(match.target, blockMessage, blockHint, match.fact)

  const adapterFindings = (fact: PreferFunctionCompositionAdapterFact) => {
    const hint = adapterHint(fact.typeText, fact.propertyName, fact.partialText)

    return oneFinding(match.target, adapterMessage, hint, match.fact)
  }

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "block" }, blockFindings),
    EffectMatch.when({ kind: "adapter" }, adapterFindings),
    EffectMatch.exhaustive
  )
}

export const preferFunctionComposition = defineBuiltinPolicy(
  "prefer-function-composition",
  preferFunctionCompositionMatcher,
  Function.constant(preferFunctionCompositionFindings)
)
