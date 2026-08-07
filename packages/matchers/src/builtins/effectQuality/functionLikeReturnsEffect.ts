import { flow, Option, pipe } from "effect"
import * as ts from "typescript"
import { typeIsEffect } from "./effectSymbolOfType.js"

export const functionLikeReturnsEffect =
  (checker: ts.TypeChecker) => (declaration: ts.SignatureDeclaration) =>
    pipe(
      declaration,
      flow(checker.getSignatureFromDeclaration.bind(checker), Option.fromNullishOr),
      Option.map(checker.getReturnTypeOfSignature.bind(checker)),
      Option.exists(typeIsEffect)
    )
