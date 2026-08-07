import { Array } from "effect"

import * as ts from "typescript"

import { unwrapCallee } from "../../support/unwrapCallee.js"

import { importedEffectApiAt } from "../functionalCoreEffect/importedEffectApiAt.js"

const effectFnNames = Array.of("fn")

export const isEffectFnApi = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const callee = unwrapCallee(expression)

  return importedEffectApiAt(checker, callee, "Effect", effectFnNames)
}
