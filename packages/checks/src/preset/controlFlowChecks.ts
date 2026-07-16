import { Array } from "effect"
import { noCallbacks } from "../checks/noCallbacks.js"
import { noAsyncFunctions } from "../checks/noAsyncFunctions.js"
import { noArraySpread } from "../checks/noArraySpread.js"
import { noPrimitiveArrayConstructors } from "../checks/noPrimitiveArrayConstructors.js"
import { noForInLoops } from "../checks/noForInLoops.js"
import { noForLoops } from "../checks/noForLoops.js"
import { noForOfLoops } from "../checks/noForOfLoops.js"
import { noSwitchStatements } from "../checks/noSwitchStatements.js"
import { noFunctionKeyword } from "../checks/noFunctionKeyword.js"
import { noInlineClosures } from "../checks/noInlineClosures.js"
import { noNestedCalls } from "../checks/noNestedCalls.js"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"

// Member order is pinned because concatenated categories define the public report block order.
export const controlFlowChecks: ReadonlyArray<NamedCheck> = Array.make(
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
