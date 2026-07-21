import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import {
  preferEtaReductionMatcher,
  type PreferEtaReductionFact
} from "@better-typescript/matchers/builtins/preferEtaReduction"
import { makeBuiltinPolicy } from "../definePolicy.js"

const message = "Avoid wrapping a function call that only forwards its argument."

const etaHint =
  "Eta-reduce this arrow to the function value itself (pass f instead of " +
  "(x) => f(x)). If the callee is already partially applied, use that partial " +
  "directly. Do not nest calls."

const flowHint =
  "Replace this nested unary call tower with flow(...steps) left-to-right " +
  "(innermost callee first). Do not nest the calls."

const makePreferEtaReductionFindings = (match: Match<PreferEtaReductionFact>) => {
  const makeEtaFindings = () => makeFindings(match.target, message, etaHint, match.fact)
  const makeFlowFindings = () => makeFindings(match.target, message, flowHint, match.fact)

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ style: "eta" }, makeEtaFindings),
    EffectMatch.when({ style: "flow" }, makeFlowFindings),
    EffectMatch.exhaustive
  )
}

export const preferEtaReduction = makeBuiltinPolicy(
  "prefer-eta-reduction",
  preferEtaReductionMatcher,
  Function.constant(makePreferEtaReductionFindings)
)
