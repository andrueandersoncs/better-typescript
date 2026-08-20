import { Array, Struct, flow } from "effect"
import * as ts from "typescript"
import { unwrapCallee } from "../unwrapCallee.js"
import { emptyHeritageClauses } from "./emptyHeritageClauses.js"
import { importedEffectApiAt } from "./importedEffectApiAt.js"

export const classExtendsEffectApi =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (memberName: string) =>
  (declaration: ts.ClassDeclaration) => {
    const clauses = declaration.heritageClauses ?? emptyHeritageClauses
    const names = Array.of(memberName)

    const heritageIsEffectApi = flow(
      Struct.get<ts.ExpressionWithTypeArguments, "expression">("expression"),
      unwrapCallee,
      importedEffectApiAt(checker)(namespace)(names)
    )

    const someHeritageType = (clause: ts.HeritageClause) =>
      Array.some(clause.types, heritageIsEffectApi)

    return Array.some(clauses, someHeritageType)
  }
