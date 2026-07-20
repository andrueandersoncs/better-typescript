import { Array } from "effect"
import { conceptControl } from "../checks/conceptControl/conceptControl.js"
import { preferConditionalReturn } from "../checks/preferConditionalReturn.js"
import { preferDirectBooleanReturn } from "../checks/preferDirectBooleanReturn.js"
import { preferDirectYield } from "../checks/preferDirectYield.js"
import { preferComposedCallbacks } from "../checks/preferComposedCallbacks.js"
import { preferFunctionComposition } from "../checks/preferFunctionComposition.js"
import { preferEtaReduction } from "../checks/preferEtaReduction.js"
import { preferFunctionFlip } from "../checks/preferFunctionFlip.js"
import { preferImplicitReturn } from "../checks/preferImplicitReturn.js"
import { noReexports } from "../checks/noReexports.js"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"

// Member order is pinned because concatenated categories define the public report block order.
export const conceptAndCompositionChecks: ReadonlyArray<NamedCheck> = Array.make(
  conceptControl,
  preferConditionalReturn,
  preferDirectBooleanReturn,
  preferDirectYield,
  preferComposedCallbacks,
  preferFunctionComposition,
  preferEtaReduction,
  preferFunctionFlip,
  preferImplicitReturn,
  noReexports
)
