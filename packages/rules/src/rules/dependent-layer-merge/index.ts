import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"
import { makeRule } from "../../internal/rule/makeRule.js"
import { dependentLayerMergeScanner } from "./dependentLayerMerge.js"

export const dependentLayerMerge = makeRule("dependent-layer-merge")(dependentLayerMergeScanner)(
  fixedRuleMessage(
    "Compose dependent layers with Layer.provide or Layer.provideMerge, not Layer.merge.",
    "Use Layer.provide to hide dependency services, or Layer.provideMerge to keep them exposed; reserve merge and mergeAll for independent layers."
  )
)
