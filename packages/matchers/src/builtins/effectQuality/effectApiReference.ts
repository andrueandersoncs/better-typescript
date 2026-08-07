import * as ts from "typescript"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

import { importedEffectApiAt } from "../functionalCoreEffect/importedEffectApiAt.js"

export const effectApiReference =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (expression: ts.Expression) => {
    const unwrapped = unwrapTransparentExpression(expression)

    return importedEffectApiAt(checker, unwrapped, namespace, names)
  }
