import { Array } from "effect"
import { noManualTypeDispatch } from "../checks/noManualTypeDispatch.js"
import { noMonomorphicStructGet } from "../checks/noMonomorphicStructGet.js"
import { noRawObjectTypes } from "../checks/noRawObjectTypes.js"
import { noFirstPartySchemaDeclare } from "../checks/noFirstPartySchemaDeclare.js"
import { noInstanceof } from "../checks/noInstanceof.js"
import { preferHashSet } from "../checks/preferHashSet.js"
import { preferHashMap } from "../checks/preferHashMap.js"
import { preferOptionMatch } from "../checks/preferOptionMatch.js"
import { preferPipeFunction } from "../checks/preferPipeFunction.js"
import { preferCurriedDataLastFunctions } from "../checks/preferCurriedDataLastFunctions/preferCurriedDataLastFunctions.js"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"

// Member order is pinned because concatenated categories define the public report block order.
export const dispatchAndCollectionChecks: ReadonlyArray<NamedCheck> = Array.make(
  noManualTypeDispatch,
  noMonomorphicStructGet,
  noRawObjectTypes,
  noFirstPartySchemaDeclare,
  noInstanceof,
  preferHashSet,
  preferHashMap,
  preferOptionMatch,
  preferPipeFunction,
  preferCurriedDataLastFunctions
)
