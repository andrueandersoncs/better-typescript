import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { alwaysExitsScope, hasNoElseBranch, unwrapSingleStatementBlock } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-duplicate-if-bodies"

const isGuardIfStatement = (statement: ts.Statement): statement is ts.IfStatement =>
  ts.isIfStatement(statement) && hasNoElseBranch(statement)

const statementBefore =
  (statement: ts.Statement) =>
  (block: ts.Block): Option.Option<ts.Statement> => {
    const statementIndex = block.statements.indexOf(statement)

    return Option.fromNullable(block.statements[statementIndex - 1])
  }

const previousSiblingStatement = (statement: ts.Statement): Option.Option<ts.Statement> =>
  Option.liftPredicate(ts.isBlock)(statement.parent).pipe(
    Option.flatMap(statementBefore(statement))
  )

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

const bodyFingerprint = (sourceFile: ts.SourceFile, statement: ts.Statement): string => {
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
    const hasDuplicateBody = haveIdenticalBodies(context, previousIfStatement, ifStatement)
    const bodyExitsScope = alwaysExitsScope(ifStatement.thenStatement)
    const isMergeableDuplicate = [hasDuplicateBody, bodyExitsScope].every(Boolean)
    const combinedCondition = combinedConditionText(context, previousIfStatement, ifStatement)

    return isMergeableDuplicate ? Option.some(combinedCondition) : Option.none()
  }

const adjacentGuardDuplicate = (
  context: RuleContext,
  ifStatement: ts.IfStatement
): Option.Option<string> => {
  if (!isGuardIfStatement(ifStatement)) {
    return Option.none()
  }

  const previousStatement = previousSiblingStatement(ifStatement)
  const previousGuard = Option.filter(previousStatement, isGuardIfStatement)

  return Option.flatMap(previousGuard, guardDuplicate(context, ifStatement))
}

const isElseOf =
  (ifStatement: ts.IfStatement) =>
  (parent: ts.IfStatement): boolean =>
    parent.elseStatement === ifStatement

const elseIfParent = (ifStatement: ts.IfStatement): Option.Option<ts.IfStatement> =>
  Option.liftPredicate(ts.isIfStatement)(ifStatement.parent).pipe(
    Option.filter(isElseOf(ifStatement))
  )

const parentBodyDuplicate =
  (context: RuleContext, ifStatement: ts.IfStatement) =>
  (parentIfStatement: ts.IfStatement): Option.Option<string> => {
    const hasDuplicateBody = haveIdenticalBodies(context, parentIfStatement, ifStatement)
    const combinedCondition = combinedConditionText(context, parentIfStatement, ifStatement)

    return hasDuplicateBody ? Option.some(combinedCondition) : Option.none()
  }

const elseIfDuplicate = (
  context: RuleContext,
  ifStatement: ts.IfStatement
): Option.Option<string> =>
  elseIfParent(ifStatement).pipe(Option.flatMap(parentBodyDuplicate(context, ifStatement)))

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
  duplicateIfBodyMatch(context, ifStatement).pipe(
    Option.map(duplicateIfRuleMatch(context, ifStatement)),
    Option.toArray
  )

const check = onNode([ts.SyntaxKind.IfStatement], ts.isIfStatement, duplicateIfMatches)

export const noDuplicateIfBodies = new Rule({
  id: ruleId,
  description:
    "Disallow if branches that duplicate the body of the branch directly before them.",
  check
})
