import { Array } from "effect"
import { preferEffectSchemaGuard } from "../checks/preferEffectSchemaGuard.js"
import { preferEffectSchemaIs } from "../checks/preferEffectSchemaIs.js"
import { preferEffectSchemaConstructor } from "../checks/preferEffectSchemaConstructor.js"
import { preferEffectSchemaClass } from "../checks/preferEffectSchemaClass.js"
import { preferEffectFn } from "../checks/preferEffectFn.js"
import { preferEffectFunctionConstant } from "../checks/preferEffectFunctionConstant.js"
import { preferEffectPropertyAccessors } from "../checks/preferEffectPropertyAccessors.js"
import { preferEffectRecordFilterMap } from "../checks/preferEffectRecordFilterMap.js"
import { preferEffectArray } from "../checks/preferEffectArray.js"
import { preferEffectArrayAppendAll } from "../checks/preferEffectArrayAppendAll.js"
import { preferSchemaTaggedClass } from "../checks/preferSchemaTaggedClass.js"
import { requireWireSafeSchemaTaggedClass } from "../checks/requireWireSafeSchemaTaggedClass.js"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"

// Member order is pinned because concatenated categories define the public report block order.
export const effectIdiomChecks: ReadonlyArray<NamedCheck> = Array.make(
  preferEffectSchemaGuard,
  preferEffectSchemaIs,
  preferEffectSchemaConstructor,
  preferEffectSchemaClass,
  preferEffectFn,
  preferEffectFunctionConstant,
  preferEffectPropertyAccessors,
  preferEffectRecordFilterMap,
  preferEffectArray,
  preferEffectArrayAppendAll,
  preferSchemaTaggedClass,
  requireWireSafeSchemaTaggedClass
)
