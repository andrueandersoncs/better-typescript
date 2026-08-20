import { Function, Option, pipe } from "effect"
import * as ts from "typescript"
import { resolvedSymbolAt } from "../../internal/support/resolvedSymbolAt.js"

// NamedFunctionDeclaration is naming syntax protocol because function and method share lookup.
export type NamedFunctionDeclaration = ts.FunctionDeclaration | ts.MethodDeclaration

export const namedFunctionDeclarationName = (
  declaration: NamedFunctionDeclaration
): Option.Option<ts.Node> => Option.fromNullishOr(declaration.name)

export const variableDeclarationIdentifierName = (declaration: ts.VariableDeclaration) =>
  pipe(Option.some(declaration.name), Option.flatMap(Option.liftPredicate(ts.isIdentifier)))

export const symbolForDeclaration = (checker: ts.TypeChecker) => (declaration: ts.Node) => {
  const methodName = pipe(
    Option.liftPredicate(ts.isMethodDeclaration)(declaration),
    Option.flatMap(namedFunctionDeclarationName)
  )

  const variableName = pipe(
    Option.liftPredicate(ts.isVariableDeclaration)(declaration.parent),
    Option.flatMap(variableDeclarationIdentifierName)
  )

  const declarationName = pipe(
    Option.liftPredicate(ts.isFunctionDeclaration)(declaration),
    Option.flatMap(namedFunctionDeclarationName),
    Option.orElse(Function.constant(methodName)),
    Option.orElse(Function.constant(variableName))
  )

  return pipe(declarationName, Option.flatMap(resolvedSymbolAt(checker)))
}
