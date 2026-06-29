import { Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import {
  alwaysExitsScope,
  hasNoElseBranch,
  unwrapSingleStatementBlock
} from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-duplicate-if-bodies"

const isGuardIfStatement = (
  statement: ts.Statement
): statement is ts.IfStatement =>
  ts.isIfStatement(statement) && hasNoElseBranch(statement)

const statementBefore =
  (statement: ts.Statement) =>
  (block: ts.Block): Option.Option<ts.Statement> => {
    const statementIndex = block.statements.indexOf(statement)

    return Option.fromNullable(block.statements[statementIndex - 1])
  }

const tokenTexts =
  (sourceFile: ts.SourceFile) =>
  (node: ts.Node): ReadonlyArray<string> => {
    if (node.kind === ts.SyntaxKind.SemicolonToken) {
      return []
    }

    const children = node.getChildren(sourceFile)
    const isLeafToken = children.length === 0

    return isLeafToken
      ? [node.getText(sourceFile)]
      : children.flatMap(tokenTexts(sourceFile))
  }

const bodyFingerprint = (
  sourceFile: ts.SourceFile,
  statement: ts.Statement
): string => {
  const unwrappedBody = unwrapSingleStatementBlock(statement)

  return tokenTexts(sourceFile)(unwrappedBody).join(" ")
}

const haveIdenticalBodies = (
  context: RuleContext,
  firstIfStatement: ts.IfStatement,
  secondIfStatement: ts.IfStatement
): boolean =>
  bodyFingerprint(context.sourceFile, firstIfStatement.thenStatement) ===
  bodyFingerprint(context.sourceFile, secondIfStatement.thenStatement)

const combinedConditionText = (
  context: RuleContext,
  firstIfStatement: ts.IfStatement,
  ifStatement: ts.IfStatement
): string =>
  [
    firstIfStatement.expression.getText(context.sourceFile),
    ifStatement.expression.getText(context.sourceFile)
  ].join(" || ")

const guardDuplicate =
  (context: RuleContext, ifStatement: ts.IfStatement) =>
  (previousIfStatement: ts.IfStatement): Option.Option<string> => {
    const hasDuplicateBody = haveIdenticalBodies(
      context,
      previousIfStatement,
      ifStatement
    )
    const bodyExitsScope = alwaysExitsScope(ifStatement.thenStatement)
    const isMergeableDuplicate = [hasDuplicateBody, bodyExitsScope].every(
      Boolean
    )
    const combinedCondition = combinedConditionText(
      context,
      previousIfStatement,
      ifStatement
    )

    return isMergeableDuplicate ? Option.some(combinedCondition) : Option.none()
  }

const isElseOf =
  (ifStatement: ts.IfStatement) =>
  (parent: ts.IfStatement): boolean =>
    parent.elseStatement === ifStatement

const parentBodyDuplicate =
  (context: RuleContext, ifStatement: ts.IfStatement) =>
  (parentIfStatement: ts.IfStatement): Option.Option<string> => {
    const hasDuplicateBody = haveIdenticalBodies(
      context,
      parentIfStatement,
      ifStatement
    )
    const combinedCondition = combinedConditionText(
      context,
      parentIfStatement,
      ifStatement
    )

    return hasDuplicateBody ? Option.some(combinedCondition) : Option.none()
  }

const duplicateIfRuleMatch =
  (context: RuleContext, ifStatement: ts.IfStatement) =>
  (combinedCondition: string): RuleMatch =>
    createRuleMatch(context, {
      ruleId,
      node: ifStatement,
      message:
        "Avoid if branches that repeat the body of the branch before them.",
      hint:
        "These branches are pseudo-duplicates: the bodies are identical and only the " +
        "conditions differ. Combine them into a single branch: " +
        `if (${combinedCondition}) { ... }.`
    })

const duplicateIfMatches = (
  ifStatement: ts.IfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const guardDuplicateMatch = isGuardIfStatement(ifStatement)
    ? pipe(
        Option.liftPredicate(ts.isBlock)(ifStatement.parent),
        Option.flatMap(statementBefore(ifStatement)),
        Option.filter(isGuardIfStatement),
        Option.flatMap(guardDuplicate(context, ifStatement))
      )
    : Option.none()

  const bodyMatch = Option.isSome(guardDuplicateMatch)
    ? guardDuplicateMatch
    : pipe(
        Option.liftPredicate(ts.isIfStatement)(ifStatement.parent),
        Option.filter(isElseOf(ifStatement)),
        Option.flatMap(parentBodyDuplicate(context, ifStatement))
      )

  return pipe(
    bodyMatch,
    Option.map(duplicateIfRuleMatch(context, ifStatement)),
    Option.toArray
  )
}

const check = onNode(
  [ts.SyntaxKind.IfStatement],
  ts.isIfStatement,
  duplicateIfMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/auth.ts",
  code: `if (isAdmin) {
  return redirect("/dashboard")
}
if (isModerator) {
  return redirect("/dashboard")
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/auth.ts",
  code: `if (isAdmin || isModerator) {
  return redirect("/dashboard")
}`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noDuplicateIfBodies = new Rule({
  id: ruleId,
  description:
    "Disallow if branches that duplicate the body of the branch directly before them.",
  example,
  check
})
