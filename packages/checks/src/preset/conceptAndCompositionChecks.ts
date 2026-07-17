import { Array } from "effect"
import { conceptControl } from "../checks/conceptControl/conceptControl.js"
import { preferConditionalReturn } from "../checks/preferConditionalReturn.js"
import { preferDirectBooleanReturn } from "../checks/preferDirectBooleanReturn.js"
import { preferDirectYield } from "../checks/preferDirectYield.js"
import { preferFunctionComposition } from "../checks/preferFunctionComposition.js"
import { preferEtaReduction } from "../checks/preferEtaReduction.js"
import { preferFunctionFlip } from "../checks/preferFunctionFlip.js"
import { preferImplicitReturn } from "../checks/preferImplicitReturn.js"

// Member order is pinned because concatenated categories define the public report block order.
export const conceptAndCompositionChecks = Array.make(
  conceptControl,
  preferConditionalReturn,
  preferDirectBooleanReturn,
  preferDirectYield,
  preferFunctionComposition,
  preferEtaReduction,
  preferFunctionFlip,
  preferImplicitReturn
)
