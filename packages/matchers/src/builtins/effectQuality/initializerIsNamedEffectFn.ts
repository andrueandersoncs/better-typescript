import { Option, pipe } from "effect"

import * as ts from "typescript"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

import { EffectFnNameInspection } from "./effectFnNameInspection.js"

import { inspectEffectFnCall } from "./inspectEffectFnCall.js"

const inspectionHasName = (inspection: EffectFnNameInspection) => Option.isSome(inspection.name)

const expressionIsNamedEffectFn = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(inspectEffectFnCall(checker)(expression), Option.exists(inspectionHasName))

export const initializerIsNamedEffectFn =
  (checker: ts.TypeChecker) => (expression: ts.Expression) =>
    pipe(expression, unwrapTransparentExpression, expressionIsNamedEffectFn(checker))
