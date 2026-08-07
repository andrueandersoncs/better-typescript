import { Option, pipe } from "effect"
import * as ts from "typescript"
import { resolvedSymbolAt } from "../support/resolvedSymbolAt.js"
import { symbolDeclaredInEffectPackage } from "../support/declarationInEffectPackage.js"

export const effectRootSymbol =
  (checker: ts.TypeChecker) => (access: ts.PropertyAccessExpression) =>
    pipe(
      Option.liftPredicate(ts.isIdentifier)(access.expression),
      Option.flatMap(resolvedSymbolAt(checker)),
      Option.filter(symbolDeclaredInEffectPackage)
    )
