import { preferEffectfulFunctionScanner } from "./preferEffectfulFunction.js"

import type { RuleMessage } from "../../internal/rule/ruleMessage.js"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferEffectfulRule = () => {
  const makePreferEffectfulFunctionRuleMessage: RuleMessage<
    typeof preferEffectfulFunctionScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<typeof preferEffectfulFunctionScanner extends Scanner<infer Fact> ? Fact : never>
    ) => {
      const { functionName } = match.fact

      return makeRuleMessage(
        `Avoid synchronously unwrapping an Effect in ${functionName}.`,
        `Return the Effect from ${functionName} and compose callers with yield* or ` +
          "Effect.flatMap. Reserve Effect.runSync for the application runtime boundary."
      )
    }

  const preferEffectfulFunction = makeRule("prefer-effectful-function")(
    preferEffectfulFunctionScanner
  )(makePreferEffectfulFunctionRuleMessage)

  return preferEffectfulFunction
}

export const preferEffectfulFunction = makePreferEffectfulRule()
