import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { symbolDeclaredInEffectPackage } from "./support/tsSignature.js"
import { detection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
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

export const preferPipeFunctionExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("prefer-pipe-function")
