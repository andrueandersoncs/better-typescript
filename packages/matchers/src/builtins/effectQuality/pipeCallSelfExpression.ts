import { Option, pipe } from "effect"

import * as ts from "typescript"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

import { callArgumentAt } from "./callArgumentAt.js"

import { typedErrorFromSelf } from "./effectErrorChannel.js"

import { typedErrorRecoveryFinding } from "./typedErrorRecoveryFinding.js"

const pipeCallSelfExpression = (call: ts.CallExpression): Option.Option<ts.Expression> => {
  const callee = unwrapTransparentExpression(call.expression)

  return ts.isPropertyAccessExpression(callee)
    ? Option.some(callee.expression)
    : callArgumentAt(0)(call)
}

export const pipeCallTypedErrorFinding =
  (checker: ts.TypeChecker) => (subject: ts.Node) => (call: ts.CallExpression) =>
    pipe(
      pipeCallSelfExpression(call),
      Option.flatMap(typedErrorFromSelf(checker)),
      Option.map(() => typedErrorRecoveryFinding("catchCause")(subject))
    )
