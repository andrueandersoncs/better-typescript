import { noTrivialEffectFnScanner } from "./noTrivialEffectFn.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoTrivialEffectFn = () => {
  const noTrivialEffectFn = makeRule("no-trivial-effect-fn")(noTrivialEffectFnScanner)(
    fixedRuleMessage(
      "Avoid named Effect.fn wrappers that only forward their parameters.",
      "Export the forwarded Effect operation directly. Keep Effect.fn only when the named workflow transforms, recovers, sequences, or otherwise adds behavior."
    )
  )

  return noTrivialEffectFn
}

export const noTrivialEffectFn = makeNoTrivialEffectFn()
