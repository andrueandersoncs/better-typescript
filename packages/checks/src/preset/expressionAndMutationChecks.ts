import { Array } from "effect"
import { noExplicitAnyReturn } from "../checks/noExplicitAnyReturn.js"
import { noMultipleBooleanOperators } from "../checks/noMultipleBooleanOperators.js"
import { noInlineBooleanExpressions } from "../checks/noInlineBooleanExpressions.js"
import { noMutableArrayMethods } from "../checks/noMutableArrayMethods.js"
import { noMutableVariableDeclarations } from "../checks/noMutableVariableDeclarations.js"
import { noMutation } from "../checks/noMutation.js"
import { noWeakMap } from "../checks/noWeakMap.js"
import { noNestedIfStatements } from "../checks/noNestedIfStatements.js"
import { noNonNullAssertion } from "../checks/noNonNullAssertion.js"
import { noDuplicateIfBodies } from "../checks/noDuplicateIfBodies.js"
import { noDuplicateFunctionNames } from "../checks/noDuplicateFunctionNames.js"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"

// Member order is pinned because concatenated categories define the public report block order.
export const expressionAndMutationChecks: ReadonlyArray<NamedCheck> = Array.make(
  noExplicitAnyReturn,
  noMultipleBooleanOperators,
  noInlineBooleanExpressions,
  noMutableArrayMethods,
  noMutableVariableDeclarations,
  noMutation,
  noWeakMap,
  noNestedIfStatements,
  noNonNullAssertion,
  noDuplicateIfBodies,
  noDuplicateFunctionNames
)
