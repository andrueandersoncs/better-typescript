import * as path from "node:path"
import { Chunk, Effect, Option, Stream } from "effect"
import * as ts from "typescript"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-nested-if-statements"

export const noNestedIfStatements: Rule = {
  id: ruleId,
  description: "Disallow nested if statements in favor of boolean operators or early returns.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(ts.isIfStatement),
        Stream.filter(isNestedIfStatement),
        Stream.map((ifStatement) => createMatch(context, ifStatement)),
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

      if (!ts.isIfStatement(parent)) {
        return containingIfStatementFrom(parent, Option.fromNullable(parent.parent))
      }

      if (!isElseIfStatement(child, parent)) {
        return Option.some(parent)
      }

      return containingIfStatementFrom(parent, Option.fromNullable(parent.parent))
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

const createMatch = (context: RuleContext, ifStatement: ts.IfStatement): RuleMatch => {
  const sourceFile = context.sourceFile
  const start = ifStatement.getStart(sourceFile)
  const location = sourceFile.getLineAndCharacterOfPosition(start)

  return {
    ruleId,
    fileName: toRelativeFileName(context.projectRoot, sourceFile.fileName),
    line: location.line + 1,
    column: location.character + 1,
    message: "Avoid nesting if statements.",
    hint:
      "Combine related conditions with boolean operators, or use an early return so this " +
      "condition can remain a single-level if statement."
  }
}

const toRelativeFileName = (projectRoot: string, fileName: string): string => {
  const relative = path.relative(projectRoot, fileName)

  if (relative.length === 0) {
    return fileName
  }

  return relative
}
