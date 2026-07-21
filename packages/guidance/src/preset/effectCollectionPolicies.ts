import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { preferEffectRecordFilterMap } from "../policies/preferEffectRecordFilterMap.js"
import { preferEffectArray } from "../policies/preferEffectArray.js"
import { preferEffectArrayAppendAll } from "../policies/preferEffectArrayAppendAll.js"
import { preferEffectArrayCountBy } from "../policies/preferEffectArrayCountBy.js"
import { preferEffectIndexAccess } from "../policies/preferEffectIndexAccess.js"

// Member order is pinned because effect idiom order is part of the public report contract.
export const effectCollectionPolicies: ReadonlyArray<Policy> = Array.make(
  preferEffectRecordFilterMap,
  preferEffectArray,
  preferEffectArrayAppendAll,
  preferEffectArrayCountBy,
  preferEffectIndexAccess
)
