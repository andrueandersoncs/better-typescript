import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import {
  preferDirectBooleanReturnMatcher,
  type PreferDirectBooleanReturnFact,
  type PreferDirectBooleanReturnLiteralBranchFact
} from "@better-typescript/matchers/builtins/preferDirectBooleanReturn"
import { defineBuiltinPolicy } from "../definePolicy.js"

const andFalseHint =
  "Use && instead of branching to false (`cond && value`). When the false " +
  "branch is the then-arm (`cond ? false : value`), negate the condition into " +
  "a named boolean first so `!` and `&&` are not stacked in one expression."

const preferDirectBooleanReturnFindings = (match: Match<PreferDirectBooleanReturnFact>) => {
  const literalBranchFindings = (fact: PreferDirectBooleanReturnLiteralBranchFact) => {
    const returnExpression = fact.literalValue
      ? `(${fact.conditionText})`
      : `!(${fact.conditionText})`

    const literalText = String(fact.literalValue)

    return oneFinding(
      match.target,
      `Avoid returning ${literalText} from a conditional branch.`,
      `Use the condition as the boolean value instead: return ${returnExpression}.`,
      match.fact
    )
  }

  const andFalseFindings = () =>
    oneFinding(
      match.target,
      "Avoid conditional return followed by return false.",
      andFalseHint,
      match.fact
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "literal-branch" }, literalBranchFindings),
    EffectMatch.when({ kind: "and-false" }, andFalseFindings),
    EffectMatch.exhaustive
  )
}

export const preferDirectBooleanReturn = defineBuiltinPolicy(
  "prefer-direct-boolean-return",
  preferDirectBooleanReturnMatcher,
  Function.constant(preferDirectBooleanReturnFindings)
)
