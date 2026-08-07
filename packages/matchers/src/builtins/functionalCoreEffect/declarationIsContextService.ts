import { Option, pipe } from "effect"
import * as ts from "typescript"
import { classExtendsEffectApi } from "./classExtendsEffectApi.js"
import { declarationInitializesContextApi } from "./declarationInitializesContextApi.js"
import { contextServiceNames } from "./contextServiceNames.js"

export const declarationIsContextService = (
  checker: ts.TypeChecker,
  declaration: ts.Declaration
) => {
  const classExtendsEffectApiOf = (classDeclaration: ts.ClassDeclaration) =>
    classExtendsEffectApi(checker, classDeclaration, "Context", "Service")

  return (
    pipe(
      Option.liftPredicate(ts.isClassDeclaration)(declaration),
      Option.exists(classExtendsEffectApiOf)
    ) || declarationInitializesContextApi(checker, declaration, contextServiceNames)
  )
}
