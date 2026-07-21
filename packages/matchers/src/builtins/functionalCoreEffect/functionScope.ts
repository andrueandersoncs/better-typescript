import { Array, HashSet, Option, Predicate, pipe } from "effect"
import { strictEqual } from "../../equivalence.js"
import * as ts from "typescript"
import { hasExportModifier } from "../../support/tsNode.js"

const runtimeFunctionLikeKinds = HashSet.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor
)

export const isRuntimeFunctionLike = (node: ts.Node): node is ts.FunctionLikeDeclaration =>
  HashSet.has(runtimeFunctionLikeKinds, node.kind)

const runtimeFunctionLikeFrom = (parent: ts.Node) =>
  isRuntimeFunctionLike(parent) ? Option.some(parent) : enclosingFunctionLike(parent)

export const enclosingFunctionLike = (node: ts.Node): Option.Option<ts.FunctionLikeDeclaration> =>
  pipe(Option.fromNullishOr(node.parent), Option.flatMap(runtimeFunctionLikeFrom))

const enclosingVariableNameNode = (node: ts.Node): Option.Option<ts.Identifier> =>
  pipe(
    Option.fromNullishOr(node.parent),
    Option.flatMap((parent) => {
      if (ts.isVariableDeclaration(parent)) {
        return Option.liftPredicate(ts.isIdentifier)(parent.name)
      }

      const stopsWalk = ts.isSourceFile(parent) || isRuntimeFunctionLike(parent)

      return stopsWalk ? Option.none() : enclosingVariableNameNode(parent)
    })
  )

export const declarationNameNode = (declaration: ts.FunctionLikeDeclaration) => {
  const isFunctionDeclaration = ts.isFunctionDeclaration(declaration)
  const isFunctionExpression = ts.isFunctionExpression(declaration)
  const isMethod = ts.isMethodDeclaration(declaration)
  const namedFunctionFlags = Array.make(isFunctionDeclaration, isFunctionExpression, isMethod)
  const isNamedFunction = Array.some(namedFunctionFlags, Boolean)

  if (!isNamedFunction) {
    return enclosingVariableNameNode(declaration)
  }

  const directName = pipe(Option.fromNullishOr(declaration.name), Option.filter(ts.isIdentifier))
  const hasDirectName = Option.isSome(directName)
  const keepDirectFlags = Array.make(hasDirectName, isMethod)
  const keepDirect = Array.some(keepDirectFlags, Boolean)

  return keepDirect ? directName : enclosingVariableNameNode(declaration)
}

export const isTopLevelExportedDeclaration = (node: ts.Node) => {
  const visitParent = (current: ts.Node): boolean =>
    pipe(
      Option.fromNullishOr(current.parent),
      Option.filter(Predicate.not(ts.isSourceFile)),
      Option.exists(visit)
    )

  const statementIsTopLevel = (statement: ts.Statement) =>
    strictEqual(ts.SyntaxKind.SourceFile)(statement.parent.kind)

  const visit = (current: ts.Node): boolean =>
    pipe(
      Option.liftPredicate(ts.isStatement)(current),
      Option.filter(statementIsTopLevel),
      Option.match({
        onNone: () => visitParent(current),
        onSome: hasExportModifier
      })
    )

  return visit(node)
}
