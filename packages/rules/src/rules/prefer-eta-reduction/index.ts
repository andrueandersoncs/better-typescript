import { preferEtaReductionScanner } from "./preferEtaReduction.js"

import { Function, pipe, Match as EffectMatch } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferEtaReduction = () => {
  const message = "Avoid wrapping a function call that only forwards its argument."

  const etaHint =
    "Eta-reduce this arrow to the function value itself (pass f instead of " +
    "(x) => f(x)). If the callee is already partially applied, use that partial " +
    "directly. Do not nest calls."

  const flowHint =
    "Replace this nested unary call tower with flow(...steps) left-to-right " +
    "(innermost callee first). Do not nest the calls."

  const makePreferEtaReductionFindings = (
    match: Match<typeof preferEtaReductionScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const makeEtaFindings = () => makeRuleMessage(message, etaHint)
    const makeFlowFindings = () => makeRuleMessage(message, flowHint)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ style: "eta" }, makeEtaFindings),
      EffectMatch.when({ style: "flow" }, makeFlowFindings),
      EffectMatch.exhaustive
    )
  }

  const preferEtaReduction = makeRule("prefer-eta-reduction")(preferEtaReductionScanner)(
    Function.constant(makePreferEtaReductionFindings)
  )

  return preferEtaReduction
}

export const preferEtaReduction = makePreferEtaReduction()
