import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"
import { makeRule } from "../../internal/rule/makeRule.js"
import { preferLayerUnwrapScanner } from "./preferLayerUnwrap.js"

export const preferLayerUnwrap = makeRule("prefer-layer-unwrap")(preferLayerUnwrapScanner)(
  fixedRuleMessage(
    "Flatten an Effect that produces a Layer with Layer.unwrap.",
    "Replace the manual Layer.effect and Layer.flatMap bridge with Layer.unwrap(effect)."
  )
)
