import { Array } from "effect"
import { preferEffectRecordFilterMap } from "../checks/preferEffectRecordFilterMap.js"
import { preferEffectArray } from "../checks/preferEffectArray.js"
import { preferEffectArrayAppendAll } from "../checks/preferEffectArrayAppendAll.js"
import { preferEffectArrayCountBy } from "../checks/preferEffectArrayCountBy.js"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"

// Member order is pinned because effect idiom order is part of the public report contract.
export const effectCollectionChecks: ReadonlyArray<NamedCheck> = Array.make(
  preferEffectRecordFilterMap,
  preferEffectArray,
  preferEffectArrayAppendAll,
  preferEffectArrayCountBy
)
