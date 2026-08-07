import { Array, Function, Match, pipe } from "effect"

import * as ts from "typescript"

import { foldAst } from "../../sources/foldAst.js"

import { importedEffectApiAt } from "../functionalCoreEffect/importedEffectApiAt.js"

export const expressionTreeHasEffectApi =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (expression: ts.Expression) => {
    const apiAt = (nodeExpression: ts.Expression) =>
      importedEffectApiAt(checker, nodeExpression, namespace, names)

    const callExpressionApiAt = (call: ts.CallExpression) => apiAt(call.expression)

    const matchCurrent = (current: ts.Node) =>
      pipe(
        Match.value(current),
        Match.when(ts.isCallExpression, callExpressionApiAt),
        Match.when(ts.isPropertyAccessExpression, apiAt),
        Match.orElse(Function.constFalse)
      )

    const reducer = (found: boolean, current: ts.Node) => {
      const matchesCurrent = matchCurrent(current)
      const signals = Array.make(found, matchesCurrent)

      return Array.some(signals, Boolean)
    }

    return foldAst(reducer)(expression)(false)
  }
