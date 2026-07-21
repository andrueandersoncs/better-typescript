import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import {
  preferDirectBooleanReturnMatcher,
  type PreferDirectBooleanReturnFact,
  type PreferDirectBooleanReturnLiteralBranchFact
} from "@better-typescript/matchers/builtins/preferDirectBooleanReturn"
import { makeBuiltinPolicy } from "../definePolicy.js"

const andFalseHint =
  "Use && instead of branching to false (`cond && value`). When the false " +
  "branch is the then-arm (`cond ? false : value`), negate the condition into " +
  "a named boolean first so `!` and `&&` are not stacked in one expression."

const makePreferDirectBooleanReturnFindings = (match: Match<PreferDirectBooleanReturnFact>) => {
  const makeLiteralBranchFindings = (fact: PreferDirectBooleanReturnLiteralBranchFact) => {
    const returnExpression = fact.literalValue
      ? `(${fact.conditionText})`
      : `!(${fact.conditionText})`

    const literalText = String(fact.literalValue)

    return makeFindings(
      match.target,
      `Avoid returning ${literalText} from a conditional branch.`,
      `Use the condition as the boolean value instead: return ${returnExpression}.`,
      match.fact
    )
  }

  const makeAndFalseFindings = () =>
    makeFindings(
      match.target,
      "Avoid conditional return followed by return false.",
      andFalseHint,
      match.fact
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "literal-branch" }, makeLiteralBranchFindings),
    EffectMatch.when({ kind: "and-false" }, makeAndFalseFindings),
    EffectMatch.exhaustive
  )
}

export const preferDirectBooleanReturn = makeBuiltinPolicy(
  "prefer-direct-boolean-return",
  preferDirectBooleanReturnMatcher,
  Function.constant(makePreferDirectBooleanReturnFindings)
)
