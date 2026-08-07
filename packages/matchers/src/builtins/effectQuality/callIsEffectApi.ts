import * as ts from "typescript"

import { importedEffectApiAt } from "../functionalCoreEffect/importedEffectApiAt.js"

export const callIsEffectApi =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (node: ts.CallExpression) =>
    importedEffectApiAt(checker, node.expression, namespace, names)
