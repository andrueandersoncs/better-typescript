import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { noCallbacks } from "../policies/noCallbacks.js"
import { noAsyncFunctions } from "../policies/noAsyncFunctions.js"
import { noArraySpread } from "../policies/noArraySpread.js"
import { noPrimitiveArrayConstructors } from "../policies/noPrimitiveArrayConstructors.js"
import { noForInLoops } from "../policies/noForInLoops.js"
import { noForLoops } from "../policies/noForLoops.js"
import { noForOfLoops } from "../policies/noForOfLoops.js"
import { noSwitchStatements } from "../policies/noSwitchStatements.js"
import { noFunctionKeyword } from "../policies/noFunctionKeyword.js"
import { noInlineClosures } from "../policies/noInlineClosures.js"
import { noNestedCalls } from "../policies/noNestedCalls.js"

// Member order is pinned because concatenated categories define the public report block order.
export const controlFlowPolicies: ReadonlyArray<Policy> = Array.make(
  noCallbacks,
  noAsyncFunctions,
  noArraySpread,
  noPrimitiveArrayConstructors,
  noForInLoops,
  noForLoops,
  noForOfLoops,
  noSwitchStatements,
  noFunctionKeyword,
  noInlineClosures,
  noNestedCalls
)
