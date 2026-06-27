import { noAbstractClasses } from "./noAbstractClasses.js"
import { noAsyncFunctions } from "./noAsyncFunctions.js"
import { noCallbacks } from "./noCallbacks.js"
import { noClassMethodImplementations } from "./noClassMethodImplementations.js"
import { noDuplicateFunctionNames } from "./noDuplicateFunctionNames.js"
import { noDuplicateIfBodies } from "./noDuplicateIfBodies.js"
import { noExplicitAnyReturn } from "./noExplicitAnyReturn.js"
import { noForInLoops } from "./noForInLoops.js"
import { noForLoops } from "./noForLoops.js"
import { noForOfLoops } from "./noForOfLoops.js"
import { noFunctionKeyword } from "./noFunctionKeyword.js"
import { noInlineBooleanExpressions } from "./noInlineBooleanExpressions.js"
import { noInlineClosures } from "./noInlineClosures.js"
import { noManualTypeDispatch } from "./noManualTypeDispatch.js"
import { noMultipleBooleanOperators } from "./noMultipleBooleanOperators.js"
import { noMutableArrayMethods } from "./noMutableArrayMethods.js"
import { noMultiLineComments } from "./noMultiLineComments.js"
import { noMutableVariableDeclarations } from "./noMutableVariableDeclarations.js"
import { noNestedCalls } from "./noNestedCalls.js"
import { noNestedIfStatements } from "./noNestedIfStatements.js"
import { noNewError } from "./noNewError.js"
import { noRootLevelClasses } from "./noRootLevelClasses.js"
import { noSwitchStatements } from "./noSwitchStatements.js"
import { noThrow } from "./noThrow.js"
import { noTryCatch } from "./noTryCatch.js"
import { noUndefined } from "./noUndefined.js"
import { noVoidFunctions } from "./noVoidFunctions.js"
import { preferConditionalReturn } from "./preferConditionalReturn.js"
import { preferDirectBooleanReturn } from "./preferDirectBooleanReturn.js"
import { preferEffectFn } from "./preferEffectFn.js"
import { preferEffectPropertyAccessors } from "./preferEffectPropertyAccessors.js"
import { preferEffectRecordFilterMap } from "./preferEffectRecordFilterMap.js"
import { preferDataLastModule } from "./preferDataLastModule.js"
import { preferEffectSchemaClass } from "./preferEffectSchemaClass.js"
import { preferEffectSchemaConstructor } from "./preferEffectSchemaConstructor.js"
import { preferEffectSchemaGuard } from "./preferEffectSchemaGuard.js"
import { preferEffectSchemaIs } from "./preferEffectSchemaIs.js"
import { preferImplicitReturn } from "./preferImplicitReturn.js"
import type { Rule } from "./types.js"

export const rules: ReadonlyArray<Rule> = [
  preferEffectSchemaGuard,
  preferEffectSchemaIs,
  preferEffectSchemaConstructor,
  preferEffectSchemaClass,
  preferEffectFn,
  preferEffectPropertyAccessors,
  preferEffectRecordFilterMap,
  preferDataLastModule,
  preferConditionalReturn,
  preferDirectBooleanReturn,
  preferImplicitReturn,
  noThrow,
  noNewError,
  noTryCatch,
  noUndefined,
  noVoidFunctions,
  noRootLevelClasses,
  noMultiLineComments,
  noExplicitAnyReturn,
  noMultipleBooleanOperators,
  noInlineBooleanExpressions,
  noMutableArrayMethods,
  noMutableVariableDeclarations,
  noNestedIfStatements,
  noDuplicateIfBodies,
  noDuplicateFunctionNames,
  noCallbacks,
  noAsyncFunctions,
  noForInLoops,
  noForLoops,
  noForOfLoops,
  noSwitchStatements,
  noFunctionKeyword,
  noInlineClosures,
  noNestedCalls,
  noManualTypeDispatch,
  noAbstractClasses,
  noClassMethodImplementations
]

export { ExampleSnippet, RuleContext, RuleExample, RuleMatch } from "./types.js"
export type { Rule } from "./types.js"
