import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { symbolDeclaredInEffectPackage } from "./support/tsSignature.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"

const isPipeName = (access: ts.PropertyAccessExpression) => access.name.text === "pipe"

const pipeMethodCallMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = makeDetection(context)

  const matches = (callExpression: ts.CallExpression): ReadonlyArray<Detection> => {
    const isEffectPipeAccess = (access: ts.PropertyAccessExpression) =>
      pipe(
        checker.getSymbolAtLocation(access.name),
        Option.fromNullishOr,
        Option.exists(symbolDeclaredInEffectPackage)
      )

    const pipeMethodDetection = (access: ts.PropertyAccessExpression) =>
      match({
        node: access.name,
        message: "Avoid calling .pipe() as a method.",
        hint:
          'Import pipe from "effect" and call it as a standalone function: ' +
          "pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2)."
      })

    return pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(callExpression.expression),
      Option.filter(isPipeName),
      // Rewrite only Effect Pipeable.pipe because Node streams and RxJS keep different pipe semantics.
      Option.filter(isEffectPipeAccess),
      Option.map(pipeMethodDetection),
      Option.toArray
    )
  }

  return matches
}

const callExpressionKinds = Array.of(ts.SyntaxKind.CallExpression)

export const preferPipeFunction = makeCheck(
  "prefer-pipe-function",
  callExpressionKinds,
  ts.isCallExpression,
  pipeMethodCallMatches
)
