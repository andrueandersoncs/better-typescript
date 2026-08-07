import * as ts from "typescript"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { importedEffectApiAt } from "./importedEffectApiAt.js"

export const callConstructsContextApi = (
  checker: ts.TypeChecker,
  expression: ts.Expression,
  names: ReadonlyArray<string>
): boolean => {
  const current = unwrapTransparentExpression(expression)

  if (!ts.isCallExpression(current)) {
    return importedEffectApiAt(checker, current, "Context", names)
  }

  const callee = unwrapCallee(current.expression)
  const direct = importedEffectApiAt(checker, callee, "Context", names)
  return direct || callConstructsContextApi(checker, current.expression, names)
}
