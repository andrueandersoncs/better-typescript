import { Array } from "effect"
import type { Policy } from "@better-typescript/core/engine/policy/data"
import { noExplicitAnyReturn } from "../policies/noExplicitAnyReturn.js"
import { noMultipleBooleanOperators } from "../policies/noMultipleBooleanOperators.js"
import { noInlineBooleanExpressions } from "../policies/noInlineBooleanExpressions.js"
import { noMutableArrayMethods } from "../policies/noMutableArrayMethods.js"
import { noMutableVariableDeclarations } from "../policies/noMutableVariableDeclarations.js"
import { noMutation } from "../policies/noMutation.js"
import { noWeakMap } from "../policies/noWeakMap.js"
import { noNestedIfStatements } from "../policies/noNestedIfStatements.js"
import { noNonNullAssertion } from "../policies/noNonNullAssertion.js"
import { noDuplicateIfBodies } from "../policies/noDuplicateIfBodies.js"
import { noDuplicateFunctionNames } from "../policies/noDuplicateFunctionNames.js"

// Member order is pinned because concatenated categories define the public report block order.
export const expressionAndMutationPolicies: ReadonlyArray<Policy> = Array.make(
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
