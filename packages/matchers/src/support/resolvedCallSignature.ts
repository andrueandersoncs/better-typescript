import * as ts from "typescript"
import type { CallLikeExpression } from "./callLikeExpression.js"
import { pipe, Option } from "effect"

export const resolvedCallSignature = (checker: ts.TypeChecker) => (call: CallLikeExpression) =>
  pipe(checker.getResolvedSignature(call), Option.fromNullishOr)
