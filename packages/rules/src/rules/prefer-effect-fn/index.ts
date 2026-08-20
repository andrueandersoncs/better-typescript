import { Function } from "effect"
import { makeRule } from "../../internal/rule/makeRule.js"
import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"
import type { Match } from "../../internal/scanner/match.js"
import type { Scanner } from "../../internal/scanner/scannerData.js"
import { preferEffectFnScanner } from "./preferEffectFn.js"

const preferEffectFnHint =
  "Use Effect.fn for the outer function and move the generator body out of Effect.gen. " +
  "Preserve any self/this binding on the Effect.fn call."

const makePreferEffectFnMessage = (
  match: Match<typeof preferEffectFnScanner extends Scanner<infer Fact> ? Fact : never>
) =>
  makeRuleMessage(
    `Avoid wrapping the body of ${match.fact.functionName} in Effect.gen; use Effect.fn.`,
    preferEffectFnHint
  )

export const preferEffectFn = makeRule("prefer-effect-fn")(preferEffectFnScanner)(
  Function.constant(makePreferEffectFnMessage)
)
