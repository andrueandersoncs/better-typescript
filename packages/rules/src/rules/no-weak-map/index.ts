import { noWeakMapScanner } from "./noWeakMap.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoWeakMap = () => {
  const message = "Avoid WeakMap because it keeps mutable state outside Effect."

  const hint =
    "Store immutable state in an Effect Ref instead. Use SynchronizedRef when updates are " +
    "effectful, or SubscriptionRef when consumers need a stream of changes. Create the " +
    "reference inside an Effect or Layer instead of retaining a module-level WeakMap."

  const noWeakMap = makeRule("no-weak-map")(noWeakMapScanner)(fixedRuleMessage(message, hint))

  return noWeakMap
}

export const noWeakMap = makeNoWeakMap()
