import { Array, pipe } from "effect"
import { preferEffectSchemaGuard } from "../checks/preferEffectSchemaGuard.js"
import { preferEffectSchemaIs } from "../checks/preferEffectSchemaIs.js"
import { preferEffectSchemaConstructor } from "../checks/preferEffectSchemaConstructor.js"
import { preferEffectSchemaRecord } from "../checks/preferEffectSchemaRecord.js"
import { preferEffectFn } from "../checks/preferEffectFn.js"
import { preferEffectfulFunction } from "../checks/preferEffectfulFunction.js"
import { preferEffectFunctionConstant } from "../checks/preferEffectFunctionConstant.js"
import { preferEffectPropertyAccessors } from "../checks/preferEffectPropertyAccessors.js"
import { preferSchemaTaggedStruct } from "../checks/preferSchemaTaggedStruct.js"
import { effectCollectionChecks } from "./effectCollectionChecks.js"
import { noUnsafeEffectApis } from "../checks/noUnsafeEffectApis.js"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"

const effectSchemaChecks: ReadonlyArray<NamedCheck> = Array.make(
  preferEffectSchemaGuard,
  preferEffectSchemaIs,
  preferEffectSchemaConstructor,
  preferEffectSchemaRecord
)

const effectFunctionChecks: ReadonlyArray<NamedCheck> = Array.make(
  preferEffectFn,
  preferEffectfulFunction,
  preferEffectFunctionConstant,
  preferEffectPropertyAccessors
)

const schemaModelingChecks: ReadonlyArray<NamedCheck> = Array.make(preferSchemaTaggedStruct)

// Member order is pinned because concatenated categories define the public report block order.
export const effectIdiomChecks: ReadonlyArray<NamedCheck> = pipe(
  effectSchemaChecks,
  Array.appendAll(effectFunctionChecks),
  Array.appendAll(effectCollectionChecks),
  Array.appendAll(schemaModelingChecks),
  Array.append(noUnsafeEffectApis)
)
