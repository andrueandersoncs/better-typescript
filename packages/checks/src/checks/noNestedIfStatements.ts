import { Array, HashSet, Option } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

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

    const isElseBranch = parentNode.elseStatement === child

    return isElseBranch
      ? containingIfStatementFrom(parentNode)(grandparent)
      : Option.some(parentNode)
  }

const nestedIfMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<Detection> => {
    const parentOption = Option.fromNullishOr(ifStatement.parent)
    const containingIf = containingIfStatementFrom(ifStatement)(parentOption)

    const reported = match({
      node: ifStatement,
      message: "Avoid nesting if statements.",
      hint:
        "Combine related conditions with boolean operators, or use an early return so this " +
        "condition can remain a single-level if statement."
    })

    return Option.isSome(containingIf) ? Array.of(reported) : Array.empty()
  }

  return matches
}

const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)
const check = nodeCheck(ifStatementKinds)(ts.isIfStatement)(nestedIfMatches)

export const noNestedIfStatements: Check = check

export const noNestedIfStatementsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-nested-if-statements")
