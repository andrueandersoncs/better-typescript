import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { conceptControl } from "../policies/conceptControl.js"
import { preferConditionalReturn } from "../policies/preferConditionalReturn.js"
import { preferDirectBooleanReturn } from "../policies/preferDirectBooleanReturn.js"
import { preferDirectYield } from "../policies/preferDirectYield.js"
import { preferComposedCallbacks } from "../policies/preferComposedCallbacks.js"
import { preferFunctionComposition } from "../policies/preferFunctionComposition.js"
import { preferEtaReduction } from "../policies/preferEtaReduction.js"
import { preferFunctionFlip } from "../policies/preferFunctionFlip.js"
import { preferImplicitReturn } from "../policies/preferImplicitReturn.js"
import { noReexports } from "../policies/noReexports.js"
import { noExportAliases } from "../policies/noExportAliases.js"

// Member order is pinned because concatenated categories define the public report block order.
export const conceptAndCompositionPolicies: ReadonlyArray<Policy> = Array.make(
  conceptControl,
  preferConditionalReturn,
  preferDirectBooleanReturn,
  preferDirectYield,
  preferComposedCallbacks,
  preferFunctionComposition,
  preferEtaReduction,
  preferFunctionFlip,
  preferImplicitReturn,
  noReexports,
  noExportAliases
)
