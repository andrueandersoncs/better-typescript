import { Array, Function, HashSet, Option, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"
import { strictEqual } from "../equivalence.js"

// NoNestedIfStatementsFact is empty payload because guidance and matchers share identity.
export const NoNestedIfStatementsFact = Schema.Struct({})

export interface NoNestedIfStatementsFact extends Schema.Schema.Type<
  typeof NoNestedIfStatementsFact
> {}

// emptyNoNestedIfStatementsFact is empty payload because guidance and matchers share identity.
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
  (parent: Option.Option<ts.Node>): Option.Option<ts.IfStatement> => {
    if (Option.isNone(parent)) {
      return Option.none()
    }

    const parentNode = parent.value

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
  }

const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)

const matchNestedIfStatement = (ifStatement: ts.IfStatement) => {
  const parentOption = Option.fromNullishOr(ifStatement.parent)
  const containingIf = containingIfStatementFrom(ifStatement)(parentOption)

  if (Option.isNone(containingIf)) {
    return Array.empty()
  }

  const match = nodeMatch(ifStatement, emptyNoNestedIfStatementsFact)

  return Array.of(match)
}

const noNestedIfStatementsMatches = Function.constant(matchNestedIfStatement)

export const noNestedIfStatementsMatcher = nodeMatcher(ifStatementKinds)(ts.isIfStatement)(
  noNestedIfStatementsMatches
)
