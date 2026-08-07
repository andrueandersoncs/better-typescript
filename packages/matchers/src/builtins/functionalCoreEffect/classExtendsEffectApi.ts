import { Array } from "effect"
import * as ts from "typescript"
import { unwrapCallee } from "../../support/unwrapCallee.js"
import { emptyHeritageClauses } from "./emptyHeritageClauses.js"
import { importedEffectApiAt } from "./importedEffectApiAt.js"

export const classExtendsEffectApi = (
  checker: ts.TypeChecker,
  declaration: ts.ClassDeclaration,
  namespace: string,
  memberName: string
) => {
  const clauses = declaration.heritageClauses ?? emptyHeritageClauses
  const names = Array.of(memberName)

  const someHeritageType = (clause: ts.HeritageClause) =>
    Array.some(clause.types, (heritage) => {
      const callee = unwrapCallee(heritage.expression)
      return importedEffectApiAt(checker, callee, namespace, names)
    })

  return Array.some(clauses, someHeritageType)
}
