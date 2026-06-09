import { noCallbacks } from "./noCallbacks.js"
import { noFunctionKeyword } from "./noFunctionKeyword.js"
import { noMultipleBooleanOperators } from "./noMultipleBooleanOperators.js"
import { noMutableVariableDeclarations } from "./noMutableVariableDeclarations.js"
import { noNestedIfStatements } from "./noNestedIfStatements.js"
import { noNewError } from "./noNewError.js"
import { noThrow } from "./noThrow.js"
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
  noMultipleBooleanOperators,
  noMutableVariableDeclarations,
  noNestedIfStatements,
  noCallbacks,
  noFunctionKeyword
]

export type { Rule, RuleContext, RuleMatch } from "./types.js"
