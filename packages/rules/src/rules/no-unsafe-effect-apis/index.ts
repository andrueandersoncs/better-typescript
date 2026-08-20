import { noUnsafeEffectApisScanner } from "./noUnsafeEffectApis.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoUnsafeEffectApis = () => {
  const message = "Avoid unsafe Effect APIs."

  const hint =
    "Use the safe Effect API and handle its Effect, Option, Result, or identity semantics " +
    "explicitly. If no safe counterpart preserves the required behavior, redesign the boundary " +
    "instead of using an API whose name contains unsafe."

  const noUnsafeEffectApis = makeRule("no-unsafe-effect-apis")(noUnsafeEffectApisScanner)(
    fixedRuleMessage(message, hint)
  )

  return noUnsafeEffectApis
}

export const noUnsafeEffectApis = makeNoUnsafeEffectApis()
