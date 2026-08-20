import { preferEffectIndexAccessScanner } from "./preferEffectIndexAccess.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makePreferEffectIndexAccess = () => {
  const hint =
    "Use Array.get(collection, index) to represent a potentially absent array element, " +
    "or Array.headNonEmpty when a collection is proven non-empty. For a fixed-length tuple, " +
    "use Tuple.get(tuple, index) to preserve its positional type."

  const message = "Avoid direct array and tuple index access."

  const preferEffectIndexAccess = makeRule("prefer-effect-index-access")(
    preferEffectIndexAccessScanner
  )(fixedRuleMessage(message, hint))

  return preferEffectIndexAccess
}

export const preferEffectIndexAccess = makePreferEffectIndexAccess()
