import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import {
  preferEtaReductionMatcher,
  type PreferEtaReductionFact
} from "@better-typescript/matchers/builtins/preferEtaReduction"
import { defineBuiltinPolicy } from "../definePolicy.js"

const message = "Avoid wrapping a function call that only forwards its argument."

const etaHint =
  "Eta-reduce this arrow to the function value itself (pass f instead of " +
  "(x) => f(x)). If the callee is already partially applied, use that partial " +
  "directly. Do not nest calls."

const flowHint =
  "Replace this nested unary call tower with flow(...steps) left-to-right " +
  "(innermost callee first). Do not nest the calls."

const preferEtaReductionFindings = (match: Match<PreferEtaReductionFact>) => {
  const etaFindings = () => oneFinding(match.target, message, etaHint, match.fact)
  const flowFindings = () => oneFinding(match.target, message, flowHint, match.fact)

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ style: "eta" }, etaFindings),
    EffectMatch.when({ style: "flow" }, flowFindings),
    EffectMatch.exhaustive
  )
}

export const preferEtaReduction = defineBuiltinPolicy(
  "prefer-eta-reduction",
  preferEtaReductionMatcher,
  Function.constant(preferEtaReductionFindings)
)
