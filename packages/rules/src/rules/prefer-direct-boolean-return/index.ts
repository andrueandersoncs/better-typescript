import { preferDirectBooleanReturnScanner } from "./preferDirectBooleanReturn.js"

import { Function, pipe, Match as EffectMatch } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferDirectBooleanReturn = () => {
  const andFalseHint =
    "Use && instead of branching to false (`cond && value`). When the false " +
    "branch is the then-arm (`cond ? false : value`), negate the condition into " +
    "a named boolean first so `!` and `&&` are not stacked in one expression."

  const makePreferDirectBooleanReturnFindings = (
    match: Match<typeof preferDirectBooleanReturnScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const makeLiteralBranchFindings = (
      fact: Extract<
        typeof preferDirectBooleanReturnScanner extends Scanner<infer Fact> ? Fact : never,
        { readonly kind: "literal-branch" }
      >
    ) => {
      const returnExpression = fact.literalValue
        ? `(${fact.conditionText})`
        : `!(${fact.conditionText})`

      const literalText = String(fact.literalValue)

      return makeRuleMessage(
        `Avoid returning ${literalText} from a conditional branch.`,
        `Use the condition as the boolean value instead: return ${returnExpression}.`
      )
    }

    const makeAndFalseFindings = () =>
      makeRuleMessage("Avoid conditional return followed by return false.", andFalseHint)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "literal-branch" }, makeLiteralBranchFindings),
      EffectMatch.when({ kind: "and-false" }, makeAndFalseFindings),
      EffectMatch.exhaustive
    )
  }

  const preferDirectBooleanReturn = makeRule("prefer-direct-boolean-return")(
    preferDirectBooleanReturnScanner
  )(Function.constant(makePreferDirectBooleanReturnFindings))

  return preferDirectBooleanReturn
}

export const preferDirectBooleanReturn = makePreferDirectBooleanReturn()
