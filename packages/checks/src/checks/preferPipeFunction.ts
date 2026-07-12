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

const pipeMethodCallMatches = (context: CheckContext) => {
  const checker = context.checker
  const match = detection(context)

  const matches = (
    callExpression: ts.CallExpression
  ): ReadonlyArray<Detection> =>
    pipe(
      Option.liftPredicate(ts.isPropertyAccessExpression)(
        callExpression.expression
      ),
      Option.filter(isPipeName),
      // Rewrite only Effect's Pipeable.pipe because Node streams and RxJS observables retain different pipe semantics.
      Option.filter((access) => {
        const symbol = checker.getSymbolAtLocation(access.name)

        return pipe(
          Option.fromNullable(symbol),
          Option.exists(symbolDeclaredInEffectPackage)
        )
      }),
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
