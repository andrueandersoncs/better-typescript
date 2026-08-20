import { ifStatementKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, HashSet, Option, Schema } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import { strictEqual } from "../../internal/equivalence.js"

// NoNestedIfStatementsFact exists because its fields form one stable data contract used by the linter.
export const NoNestedIfStatementsFact = Schema.Struct({})

export interface NoNestedIfStatementsFact extends Schema.Schema.Type<
  typeof NoNestedIfStatementsFact
> {}

// emptyNoNestedIfStatementsFact exists because its fields form one stable data contract used by the linter.
export const emptyNoNestedIfStatementsFact = NoNestedIfStatementsFact.make({})

const nestedScopeBoundaryKinds = HashSet.make(
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.SetAccessor
)

const containingIfStatementFrom =
  (child: ts.Node) =>
  (parent: Option.Option<ts.Node>): Option.Option<ts.IfStatement> =>
    Option.flatMap(parent, (parentNode) => {
      if (HashSet.has(nestedScopeBoundaryKinds, parentNode.kind)) {
        return Option.none()
      }

      const grandparent = Option.fromNullishOr(parentNode.parent)

      if (!ts.isIfStatement(parentNode)) {
        return containingIfStatementFrom(parentNode)(grandparent)
      }

      const isElseBranch = strictEqual(child)(parentNode.elseStatement)

      return isElseBranch
        ? containingIfStatementFrom(parentNode)(grandparent)
        : Option.some(parentNode)
    })

const matchNestedIfStatement = (ifStatement: ts.IfStatement) => {
  const parentOption = Option.fromNullishOr(ifStatement.parent)
  const containingIf = containingIfStatementFrom(ifStatement)(parentOption)

  if (Option.isNone(containingIf)) {
    return Array.empty()
  }

  const match = makeNodeMatch(ifStatement, emptyNoNestedIfStatementsFact)

  return Array.of(match)
}

const noNestedIfStatementsMatches = Function.constant(matchNestedIfStatement)

export const noNestedIfStatementsScanner = makeNodeScanner(ifStatementKinds)(ts.isIfStatement)(
  noNestedIfStatementsMatches
)
