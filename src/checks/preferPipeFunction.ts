import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { symbolDeclaredInEffectPackage } from "./support/tsSignature.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"

const isPipeName = (access: ts.PropertyAccessExpression): boolean =>
  access.name.text === "pipe"

// Rewrite only Effect's Pipeable.pipe because Node streams and RxJS observables retain different pipe semantics.
const isEffectPipeAccess =
  (checker: ts.TypeChecker) =>
  (access: ts.PropertyAccessExpression): boolean => {
    const symbol = checker.getSymbolAtLocation(access.name)

    return pipe(
      Option.fromNullable(symbol),
      Option.exists(symbolDeclaredInEffectPackage)
    )
  }

const pipeMethodCallMatches = (context: CheckContext) => {
  const isEffectPipe = isEffectPipeAccess(context.checker)
  const match = detection(context)

  const matches = (
    callExpression: ts.CallExpression
  ): ReadonlyArray<Detection> =>
    pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(
        callExpression.expression
      ),
      Option.filter(isPipeName),
      Option.filter(isEffectPipe),
      Option.map((access) =>
        match({
          node: access.name,
          message: "Avoid calling .pipe() as a method.",
          hint:
            'Import pipe from "effect" and call it as a standalone function: ' +
            "pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2)."
        })
      ),
      Option.toArray
    )

  return matches
}

const check = nodeCheck([ts.SyntaxKind.CallExpression])(ts.isCallExpression)(
  pipeMethodCallMatches
)

export const preferPipeFunction: Check = check
