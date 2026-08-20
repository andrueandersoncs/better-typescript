import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { unwrapCallee } from "../../internal/support/unwrapCallee.js"
import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"
import { classExtendsEffectApi } from "../../internal/support/effectApi/classExtendsEffectApi.js"
import { importedEffectApiAt } from "../../internal/support/effectApi/importedEffectApiAt.js"

const contextServiceNames = Array.of("Service")

const classIsContextService = (context: MatchContext) =>
  classExtendsEffectApi(context.checker)("Context")("Service")

const variableInitializer = (declaration: ts.VariableDeclaration) =>
  Option.fromNullishOr(declaration.initializer)

const callCallee = (call: ts.CallExpression) => unwrapCallee(call.expression)

const calleeIsContextService = (context: MatchContext) =>
  importedEffectApiAt(context.checker)("Context")(contextServiceNames)

const variableIsContextService = (context: MatchContext) => (declaration: ts.VariableDeclaration) =>
  pipe(
    declaration,
    variableInitializer,
    Option.map(unwrapTransparentExpression),
    Option.filter(ts.isCallExpression),
    Option.map(callCallee),
    Option.exists(calleeIsContextService(context))
  )

export const isContextServiceDeclaration =
  (context: MatchContext) => (declaration: ts.Declaration) => {
    const classIsService = pipe(
      Option.liftPredicate(ts.isClassDeclaration)(declaration),
      Option.exists(classIsContextService(context))
    )

    const variableIsService = pipe(
      Option.liftPredicate(ts.isVariableDeclaration)(declaration),
      Option.exists(variableIsContextService(context))
    )

    return classIsService || variableIsService
  }
