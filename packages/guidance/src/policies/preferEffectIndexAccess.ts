import { preferEffectIndexAccessMatcher } from "@better-typescript/matchers/builtins/preferEffectIndexAccess"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const hint =
  "Use Array.get(collection, index) to represent a potentially absent array element, " +
  "or Array.headNonEmpty when a collection is proven non-empty. For a fixed-length tuple, " +
  "use Tuple.get(tuple, index) to preserve its positional type."

const message = "Avoid direct array and tuple index access."

export const preferEffectIndexAccess = makeBuiltinPolicy(
  "prefer-effect-index-access",
  preferEffectIndexAccessMatcher,
  factGuidance(message, hint)
)
