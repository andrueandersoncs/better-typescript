import { Option, pipe } from "effect"
import type * as ts from "typescript"
import { isFunctionInitializer } from "../../internal/support/isFunctionInitializer.js"
import { hasCallSignature } from "../../internal/support/hasCallSignature.js"
import { contextualType } from "./contextualType.js"

export const isContextuallyTypedFunction = (checker: ts.TypeChecker) => (declaration: ts.Node) => {
  const expressionHasCallSignature = (expression: ts.Expression) =>
    pipe(contextualType(checker)(expression), Option.exists(hasCallSignature(checker)))

  return pipe(
    Option.liftPredicate(isFunctionInitializer)(declaration),
    Option.exists(expressionHasCallSignature)
  )
}
