import * as ts from "typescript"

import { unwrapCallee } from "../../support/unwrapCallee.js"

import { importedEffectApiAt } from "../functionalCoreEffect/importedEffectApiAt.js"

export const effectApiCall =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (node: ts.CallExpression) => {
    const callee = unwrapCallee(node.expression)

    return importedEffectApiAt(checker, callee, namespace, names)
  }
