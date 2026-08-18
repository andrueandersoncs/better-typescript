import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../equivalence.js"
import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { isAccessExpression } from "./isAccessExpression.js"
import { ambientPathAt } from "../../support/effectApi/ambientPath.js"

const isProcess = strictEqual("process")
const isEnvironment = strictEqual("env")

const isEnvironmentPath = (segments: ReadonlyArray<string>) => {
  const processSegment = pipe(Array.get(segments, 0), Option.exists(isProcess))
  const environmentSegment = pipe(Array.get(segments, 1), Option.exists(isEnvironment))

  return processSegment && environmentSegment
}

export const isProcessEnvironmentAccess =
  (checker: ts.TypeChecker) =>
  (access: ts.PropertyAccessExpression | ts.ElementAccessExpression): boolean => {
    const direct = pipe(ambientPathAt(checker)(access), Option.exists(isEnvironmentPath))
    const receiver = unwrapTransparentExpression(access.expression)
    const receiverIsAccess = isAccessExpression(receiver)
    const checkReceiver = isProcessEnvironmentAccess(checker)
    const receiverIsProcessEnvironment = receiverIsAccess && checkReceiver(receiver)

    return direct || receiverIsProcessEnvironment
  }
