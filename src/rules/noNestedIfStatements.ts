import { Chunk, Effect, Option, Stream } from "effect"
import * as ts from "typescript"
import { createRuleMatch } from "./ruleMatch.js"
import { nodeStream } from "./traverse.js"
import type { Rule } from "./types.js"

const ruleId = "no-nested-if-statements"

export const noNestedIfStatements: Rule = {
  id: ruleId,
  description: "Disallow nested if statements in favor of boolean operators or early returns.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isIfStatement),
        Stream.filter(isNestedIfStatement),
        Stream.map((ifStatement) =>
          createRuleMatch(context, {
            ruleId,
            node: ifStatement,
            message: "Avoid nesting if statements.",
            hint:
              "Combine related conditions with boolean operators, or use an early return so this " +
              "condition can remain a single-level if statement."
          })
        ),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const isNestedIfStatement = (ifStatement: ts.IfStatement): boolean =>
  Option.isSome(containingIfStatement(ifStatement))

const containingIfStatement = (
  ifStatement: ts.IfStatement
): Option.Option<ts.IfStatement> =>
  containingIfStatementFrom(ifStatement, Option.fromNullable(ifStatement.parent))

const containingIfStatementFrom = (
  child: ts.Node,
  parent: Option.Option<ts.Node>
): Option.Option<ts.IfStatement> =>
  Option.match(parent, {
    onNone: () => Option.none(),
    onSome: (parent) => {
      if (isNestedScopeBoundary(parent)) {
        return Option.none()
      }

      return Option.match(Option.liftPredicate(ts.isIfStatement)(parent), {
        onNone: () => containingIfStatementFrom(parent, Option.fromNullable(parent.parent)),
        onSome: (parent) =>
          isElseIfStatement(child, parent)
            ? containingIfStatementFrom(parent, Option.fromNullable(parent.parent))
            : Option.some(parent)
      })
    }
  })

const isElseIfStatement = (child: ts.Node, parent: ts.IfStatement): boolean =>
  parent.elseStatement === child

const nestedScopeBoundaryKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.SetAccessor
])

const isNestedScopeBoundary = (node: ts.Node): boolean =>
  nestedScopeBoundaryKinds.has(node.kind)
