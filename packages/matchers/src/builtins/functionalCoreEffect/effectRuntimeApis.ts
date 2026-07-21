import { Array, Option, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import { unwrapTransparentExpression } from "../../support/tsNode.js"
import { importedEffectApiAt } from "./effectApiMembers.js"

export const expressionIsEffectRuntimeRunner = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  runtimeNames: ReadonlyArray<string>
) => {
  const current = unwrapTransparentExpression(expression)
  const direct = importedEffectApiAt(checker, current, "Effect", runtimeNames)

  const importedEffectApiAtOf = (call: ts.CallExpression) =>
    importedEffectApiAt(checker, call.expression, "Effect", runtimeNames)

  const curried = pipe(
    Option.liftPredicate(ts.isCallExpression)(current),
    Option.exists(importedEffectApiAtOf)
  )

  const checks = Array.make(direct, curried)

  return Array.some(checks, Boolean)
}

export const callIsPipeRuntimeHandoff = (
  checker: ts.TypeChecker,
  node: ts.CallExpression,
  runtimeNames: ReadonlyArray<string>
) => {
  const callee = unwrapTransparentExpression(node.expression)

  const accessIsNamedPipe = (access: ts.PropertyAccessExpression) =>
    strictEqual("pipe")(access.name.text)

  const isPipe = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
    Option.exists(accessIsNamedPipe)
  )

  const expressionIsEffectRuntimeRunnerOf = (argument: ts.Expression) =>
    expressionIsEffectRuntimeRunner(checker, argument, runtimeNames)

  const hasRunner = Array.some(node.arguments, expressionIsEffectRuntimeRunnerOf)
  const checks = Array.make(isPipe, hasRunner)

  return Array.every(checks, Boolean)
}
