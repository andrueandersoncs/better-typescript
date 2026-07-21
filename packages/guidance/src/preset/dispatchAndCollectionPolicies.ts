import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { noManualTypeDispatch } from "../policies/noManualTypeDispatch.js"
import { noMonomorphicStructGet } from "../policies/noMonomorphicStructGet.js"
import { noRawObjectTypes } from "../policies/noRawObjectTypes.js"
import { noFirstPartySchemaDeclare } from "../policies/noFirstPartySchemaDeclare.js"
import { noInstanceof } from "../policies/noInstanceof.js"
import { preferHashSet } from "../policies/preferHashSet.js"
import { preferHashMap } from "../policies/preferHashMap.js"
import { preferOptionMatch } from "../policies/preferOptionMatch.js"
import { preferPipeFunction } from "../policies/preferPipeFunction.js"
import { preferCurriedDataLastFunctions } from "../policies/preferCurriedDataLastFunctions.js"

// Member order is pinned because concatenated categories define the public report block order.
export const dispatchAndCollectionPolicies: ReadonlyArray<Policy> = Array.make(
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
