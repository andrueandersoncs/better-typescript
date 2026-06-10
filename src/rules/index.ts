import { noCallbacks } from "./noCallbacks.js"
import { noDuplicateIfBodies } from "./noDuplicateIfBodies.js"
import { noForOfLoops } from "./noForOfLoops.js"
import { noFunctionKeyword } from "./noFunctionKeyword.js"
import { noInlineBooleanExpressions } from "./noInlineBooleanExpressions.js"
import { noMultipleBooleanOperators } from "./noMultipleBooleanOperators.js"
import { noMutableArrayMethods } from "./noMutableArrayMethods.js"
import { noMutableVariableDeclarations } from "./noMutableVariableDeclarations.js"
import { noNestedIfStatements } from "./noNestedIfStatements.js"
import { noNewError } from "./noNewError.js"
import { noSwitchStatements } from "./noSwitchStatements.js"
import { noThrow } from "./noThrow.js"
import { noUndefined } from "./noUndefined.js"
import { preferConditionalReturn } from "./preferConditionalReturn.js"
import { preferDirectBooleanReturn } from "./preferDirectBooleanReturn.js"
import { preferEffectSchemaGuard } from "./preferEffectSchemaGuard.js"
import { preferImplicitReturn } from "./preferImplicitReturn.js"
import type { Rule } from "./types.js"

export const rules: ReadonlyArray<Rule> = [
  preferEffectSchemaGuard,
  preferConditionalReturn,
  preferDirectBooleanReturn,
  preferImplicitReturn,
  noThrow,
  noNewError,
  noUndefined,
  noMultipleBooleanOperators,
  noInlineBooleanExpressions,
  noMutableArrayMethods,
  noMutableVariableDeclarations,
  noNestedIfStatements,
  noDuplicateIfBodies,
  noCallbacks,
  noForOfLoops,
  noSwitchStatements,
  noFunctionKeyword
]

export type { Rule, RuleContext, RuleMatch } from "./types.js"
