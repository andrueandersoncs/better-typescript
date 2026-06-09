import { noCallbacks } from "./noCallbacks.js"
import { noForOfLoops } from "./noForOfLoops.js"
import { noFunctionKeyword } from "./noFunctionKeyword.js"
import { noMultipleBooleanOperators } from "./noMultipleBooleanOperators.js"
import { noMutableVariableDeclarations } from "./noMutableVariableDeclarations.js"
import { noNestedIfStatements } from "./noNestedIfStatements.js"
import { noNewError } from "./noNewError.js"
import { noThrow } from "./noThrow.js"
import { noUndefined } from "./noUndefined.js"
import { preferDirectBooleanReturn } from "./preferDirectBooleanReturn.js"
import { preferEffectSchemaGuard } from "./preferEffectSchemaGuard.js"
import { preferImplicitReturn } from "./preferImplicitReturn.js"
import type { Rule } from "./types.js"

export const rules: ReadonlyArray<Rule> = [
  preferEffectSchemaGuard,
  preferDirectBooleanReturn,
  preferImplicitReturn,
  noThrow,
  noNewError,
  noUndefined,
  noMultipleBooleanOperators,
  noMutableVariableDeclarations,
  noNestedIfStatements,
  noCallbacks,
  noForOfLoops,
  noFunctionKeyword
]

export type { Rule, RuleContext, RuleMatch } from "./types.js"
