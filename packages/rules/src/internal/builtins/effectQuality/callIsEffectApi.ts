import * as ts from "typescript"

import { importedEffectApiAt } from "../../support/effectApi/importedEffectApiAt.js"

export const callIsEffectApi =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (node: ts.CallExpression) =>
    importedEffectApiAt(checker)(namespace)(names)(node.expression)
