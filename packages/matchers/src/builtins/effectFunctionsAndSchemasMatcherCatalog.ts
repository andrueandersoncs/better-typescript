import { noImmediateEffectSyncMatcher } from "./noImmediateEffectSync.js"
import { noTrivialEffectFnMatcher } from "./noTrivialEffectFn.js"
import { preferEffectFnMatcher } from "./preferEffectFn.js"
import { preferEffectFunctionConstantMatcher } from "./preferEffectFunctionConstant.js"
import { preferEffectPropertyAccessorsMatcher } from "./preferEffectPropertyAccessors.js"
import { preferEffectSchemaConstructorMatcher } from "./preferEffectSchemaConstructor.js"
import { preferEffectSchemaGuardMatcher } from "./preferEffectSchemaGuard.js"
import { preferEffectSchemaIsMatcher } from "./preferEffectSchemaIs.js"
import { preferEffectSchemaRecordMatcher } from "./preferEffectSchemaRecord.js"
import { preferEffectfulFunctionMatcher } from "./preferEffectfulFunction.js"
import { preferSchemaTaggedStructMatcher } from "./preferSchemaTaggedStruct.js"

export const effectFunctionsAndSchemasMatcherCatalog = {
  noImmediateEffectSyncMatcher,
  noTrivialEffectFnMatcher,
  preferEffectFnMatcher,
  preferEffectFunctionConstantMatcher,
  preferEffectPropertyAccessorsMatcher,
  preferEffectfulFunctionMatcher,
  preferSchemaTaggedStructMatcher,
  preferEffectSchemaConstructorMatcher,
  preferEffectSchemaGuardMatcher,
  preferEffectSchemaIsMatcher,
  preferEffectSchemaRecordMatcher
} as const
