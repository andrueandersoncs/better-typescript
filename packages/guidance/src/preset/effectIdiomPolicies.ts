import { Array, pipe } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { preferEffectSchemaGuard } from "../policies/preferEffectSchemaGuard.js"
import { preferEffectSchemaIs } from "../policies/preferEffectSchemaIs.js"
import { preferEffectSchemaConstructor } from "../policies/preferEffectSchemaConstructor.js"
import { preferEffectSchemaRecord } from "../policies/preferEffectSchemaRecord.js"
import { preferEffectFn } from "../policies/preferEffectFn.js"
import { preferEffectfulFunction } from "../policies/preferEffectfulFunction.js"
import { preferEffectFunctionConstant } from "../policies/preferEffectFunctionConstant.js"
import { preferEffectPropertyAccessors } from "../policies/preferEffectPropertyAccessors.js"
import { preferSchemaTaggedStruct } from "../policies/preferSchemaTaggedStruct.js"
import { effectCollectionPolicies } from "./effectCollectionPolicies.js"
import { noUnsafeEffectApis } from "../policies/noUnsafeEffectApis.js"
import { preferEquivalenceStrictEqual } from "../policies/preferEquivalenceStrictEqual.js"

const effectSchemaPolicies: ReadonlyArray<Policy> = Array.make(
  preferEffectSchemaGuard,
  preferEffectSchemaIs,
  preferEffectSchemaConstructor,
  preferEffectSchemaRecord
)

const effectFunctionPolicies: ReadonlyArray<Policy> = Array.make(
  preferEffectFn,
  preferEffectfulFunction,
  preferEffectFunctionConstant,
  preferEffectPropertyAccessors
)

const schemaModelingPolicies: ReadonlyArray<Policy> = Array.make(preferSchemaTaggedStruct)

// Member order is pinned because concatenated categories define the public report block order.
export const effectIdiomPolicies: ReadonlyArray<Policy> = pipe(
  effectSchemaPolicies,
  Array.appendAll(effectFunctionPolicies),
  Array.appendAll(effectCollectionPolicies),
  Array.appendAll(schemaModelingPolicies),
  Array.append(noUnsafeEffectApis),
  Array.append(preferEquivalenceStrictEqual)
)
