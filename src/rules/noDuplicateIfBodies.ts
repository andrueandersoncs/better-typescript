import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapSingleStatementBlock } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-duplicate-if-bodies"

const hasNoElseBranch = (ifStatement: ts.IfStatement): boolean =>
  Option.isNone(Option.fromNullable(ifStatement.elseStatement))

const isGuardIfStatement = (statement: ts.Statement): statement is ts.IfStatement =>
  ts.isIfStatement(statement) && hasNoElseBranch(statement)

const statementBefore =
  (statement: ts.Statement) =>
  (block: ts.Block): Option.Option<ts.Statement> => {
    const statementIndex = block.statements.indexOf(statement)

    return Option.fromNullable(block.statements[statementIndex - 1])
  }

const previousSiblingStatement = (statement: ts.Statement): Option.Option<ts.Statement> =>
  Option.flatMap(Option.liftPredicate(ts.isBlock)(statement.parent), statementBefore(statement))

const tokenTexts =
  (sourceFile: ts.SourceFile) =>
  (node: ts.Node): ReadonlyArray<string> => {
    if (node.kind === ts.SyntaxKind.SemicolonToken) {
      return []
    }

    const children = node.getChildren(sourceFile)
    const isLeafToken = children.length === 0

    return isLeafToken ? [node.getText(sourceFile)] : children.flatMap(tokenTexts(sourceFile))
  }

const bodyFingerprint = (sourceFile: ts.SourceFile, statement: ts.Statement): string =>
  tokenTexts(sourceFile)(unwrapSingleStatementBlock(statement)).join(" ")

const haveIdenticalBodies = (
  context: RuleContext,
  firstIfStatement: ts.IfStatement,
  secondIfStatement: ts.IfStatement
): boolean =>
  bodyFingerprint(context.sourceFile, firstIfStatement.thenStatement) ===
  bodyFingerprint(context.sourceFile, secondIfStatement.thenStatement)

const exitStatementKinds = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.BreakStatement,
  ts.SyntaxKind.ContinueStatement,
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.ThrowStatement
])

const alwaysExitsScope = (statement: ts.Statement): boolean =>
  ts.isBlock(statement)
    ? blockExitsScope(statement)
    : exitStatementKinds.has(statement.kind)

const blockExitsScope = (block: ts.Block): boolean =>
  Option.exists(lastStatement(block), alwaysExitsScope)

const lastStatement = (block: ts.Block): Option.Option<ts.Statement> =>
  Option.fromNullable(block.statements[block.statements.length - 1])

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
    const hasDuplicateBody = haveIdenticalBodies(context, previousIfStatement, ifStatement)
    const bodyExitsScope = alwaysExitsScope(ifStatement.thenStatement)
    const isMergeableDuplicate = [hasDuplicateBody, bodyExitsScope].every(Boolean)

    return isMergeableDuplicate
      ? Option.some(combinedConditionText(context, previousIfStatement, ifStatement))
      : Option.none()
  }

const adjacentGuardDuplicate = (
  context: RuleContext,
  ifStatement: ts.IfStatement
): Option.Option<string> => {
  if (!isGuardIfStatement(ifStatement)) {
    return Option.none()
  }

  const previousGuard = Option.filter(previousSiblingStatement(ifStatement), isGuardIfStatement)

  return Option.flatMap(previousGuard, guardDuplicate(context, ifStatement))
}

const isElseOf =
  (ifStatement: ts.IfStatement) =>
  (parent: ts.IfStatement): boolean =>
    parent.elseStatement === ifStatement

const elseIfParent = (ifStatement: ts.IfStatement): Option.Option<ts.IfStatement> =>
  Option.filter(Option.liftPredicate(ts.isIfStatement)(ifStatement.parent), isElseOf(ifStatement))

const parentBodyDuplicate =
  (context: RuleContext, ifStatement: ts.IfStatement) =>
  (parentIfStatement: ts.IfStatement): Option.Option<string> =>
    haveIdenticalBodies(context, parentIfStatement, ifStatement)
      ? Option.some(combinedConditionText(context, parentIfStatement, ifStatement))
      : Option.none()

const elseIfDuplicate = (
  context: RuleContext,
  ifStatement: ts.IfStatement
): Option.Option<string> =>
  Option.flatMap(elseIfParent(ifStatement), parentBodyDuplicate(context, ifStatement))

const duplicateIfBodyMatch = (
  context: RuleContext,
  ifStatement: ts.IfStatement
): Option.Option<string> => {
  const guardDuplicateMatch = adjacentGuardDuplicate(context, ifStatement)

  return Option.isSome(guardDuplicateMatch)
    ? guardDuplicateMatch
    : elseIfDuplicate(context, ifStatement)
}

const duplicateIfRuleMatch =
  (context: RuleContext, ifStatement: ts.IfStatement) =>
  (combinedCondition: string): RuleMatch =>
    createRuleMatch(context, {
      ruleId,
      node: ifStatement,
      message: "Avoid if branches that repeat the body of the branch before them.",
      hint:
        "These branches are pseudo-duplicates: the bodies are identical and only the " +
        "conditions differ. Combine them into a single branch: " +
        `if (${combinedCondition}) { ... }.`
    })

const duplicateIfMatches = (
  ifStatement: ts.IfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  Option.toArray(
    Option.map(
      duplicateIfBodyMatch(context, ifStatement),
      duplicateIfRuleMatch(context, ifStatement)
    )
  )

export const noDuplicateIfBodies = new Rule({
  id: ruleId,
  description:
    "Disallow if branches that duplicate the body of the branch directly before them.",
  check: onNode([ts.SyntaxKind.IfStatement], ts.isIfStatement, duplicateIfMatches)
})
