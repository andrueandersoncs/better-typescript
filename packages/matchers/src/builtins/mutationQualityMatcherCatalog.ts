import { noDuplicateFunctionNamesMatcher } from "./noDuplicateFunctionNames.js"
import { noDuplicateIfBodiesMatcher } from "./noDuplicateIfBodies.js"
import { noExplicitAnyReturnMatcher } from "./noExplicitAnyReturn.js"
import { noInlineBooleanExpressionsMatcher } from "./noInlineBooleanExpressions.js"
import { noMultipleBooleanOperatorsMatcher } from "./noMultipleBooleanOperators.js"
import { noMutableArrayMethodsMatcher } from "./noMutableArrayMethods.js"
import { noMutableVariableDeclarationsMatcher } from "./noMutableVariableDeclarations.js"
import { noMutationMatcher } from "./noMutation.js"
import { noWeakMapMatcher } from "./noWeakMap.js"

export const mutationQualityMatcherCatalog = {
  noDuplicateIfBodiesMatcher,
  noDuplicateFunctionNamesMatcher,
  noExplicitAnyReturnMatcher,
  noMultipleBooleanOperatorsMatcher,
  noInlineBooleanExpressionsMatcher,
  noMutableArrayMethodsMatcher,
  noMutableVariableDeclarationsMatcher,
  noMutationMatcher,
  noWeakMapMatcher
} as const
