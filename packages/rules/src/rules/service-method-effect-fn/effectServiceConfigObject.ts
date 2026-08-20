import { Array, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { unwrapCallee } from "../../internal/support/unwrapCallee.js"
import { emptyHeritageClauses } from "../../internal/support/effectApi/emptyHeritageClauses.js"
import { importedEffectApiAt } from "../../internal/support/effectApi/importedEffectApiAt.js"
import { effectServiceMakerObject } from "./effectServiceMakerObject.js"
import { contextServiceNames } from "./contextServiceNames.js"

export const effectServiceConfigObject =
  (checker: ts.TypeChecker) => (declaration: ts.ClassDeclaration) => {
    const importedEffectApiAtOf = importedEffectApiAt(checker)("Context")(contextServiceNames)
    const heritageTypesOf = (clause: ts.HeritageClause) => Array.fromIterable(clause.types)

    const unwrapHeritageCallee = (heritage: ts.ExpressionWithTypeArguments) =>
      unwrapCallee(heritage.expression)

    return pipe(
      declaration.heritageClauses ?? emptyHeritageClauses,
      Array.flatMap(heritageTypesOf),
      Array.findFirst(flow(unwrapHeritageCallee, importedEffectApiAtOf)),
      Option.flatMap(
        flow(
          Struct.get<ts.ExpressionWithTypeArguments, "expression">("expression"),
          effectServiceMakerObject
        )
      )
    )
  }
