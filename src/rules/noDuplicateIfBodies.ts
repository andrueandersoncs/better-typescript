import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapSingleStatementBlock } from "./tsNode.js"
import type { Rule, RuleContext } from "./types.js"

const ruleId = "no-duplicate-if-bodies"

interface DuplicateIfBodyMatch {
  readonly ifStatement: ts.IfStatement
  readonly combinedCondition: string
}

export const noDuplicateIfBodies: Rule = {
  id: ruleId,
  description:
    "Disallow if branches that duplicate the body of the branch directly before them.",
  check: onNode([ts.SyntaxKind.IfStatement], ts.isIfStatement, (ifStatement, context) =>
    Option.match(duplicateIfBodyMatch(context, ifStatement), {
      onNone: () => [],
      onSome: (match) => [
        createRuleMatch(context, {
          ruleId,
          node: match.ifStatement,
          message: "Avoid if branches that repeat the body of the branch before them.",
          hint:
            "These branches are pseudo-duplicates: the bodies are identical and only the " +
            "conditions differ. Combine them into a single branch: " +
            `if (${match.combinedCondition}) { ... }.`
        })
      ]
    })
  )
}

const duplicateIfBodyMatch = (
  context: RuleContext,
  ifStatement: ts.IfStatement
): Option.Option<DuplicateIfBodyMatch> =>
  Option.orElse(adjacentGuardDuplicate(context, ifStatement), () =>
    elseIfDuplicate(context, ifStatement)
  )

const adjacentGuardDuplicate = (
  context: RuleContext,
  ifStatement: ts.IfStatement
): Option.Option<DuplicateIfBodyMatch> => {
  if (!isGuardIfStatement(ifStatement)) {
    return Option.none()
  }

  const previousGuard = Option.filter(previousSiblingStatement(ifStatement), isGuardIfStatement)

  return Option.flatMap(previousGuard, (previousIfStatement) =>
    guardDuplicate(context, previousIfStatement, ifStatement)
  )
}

const guardDuplicate = (
  context: RuleContext,
  previousIfStatement: ts.IfStatement,
  ifStatement: ts.IfStatement
): Option.Option<DuplicateIfBodyMatch> => {
  const hasDuplicateBody = haveIdenticalBodies(context, previousIfStatement, ifStatement)
  const bodyExitsScope = alwaysExitsScope(ifStatement.thenStatement)
  const isMergeableDuplicate = [hasDuplicateBody, bodyExitsScope].every(Boolean)

  return isMergeableDuplicate
    ? Option.some(toDuplicateMatch(context, previousIfStatement, ifStatement))
    : Option.none()
}

const elseIfDuplicate = (
  context: RuleContext,
  ifStatement: ts.IfStatement
): Option.Option<DuplicateIfBodyMatch> =>
  Option.flatMap(elseIfParent(ifStatement), (parentIfStatement) =>
    haveIdenticalBodies(context, parentIfStatement, ifStatement)
      ? Option.some(toDuplicateMatch(context, parentIfStatement, ifStatement))
      : Option.none()
  )

const elseIfParent = (ifStatement: ts.IfStatement): Option.Option<ts.IfStatement> =>
  Option.filter(
    Option.liftPredicate(ts.isIfStatement)(ifStatement.parent),
    (parent) => parent.elseStatement === ifStatement
  )

const isGuardIfStatement = (statement: ts.Statement): statement is ts.IfStatement =>
  ts.isIfStatement(statement) && hasNoElseBranch(statement)

const hasNoElseBranch = (ifStatement: ts.IfStatement): boolean =>
  Option.isNone(Option.fromNullable(ifStatement.elseStatement))

const previousSiblingStatement = (statement: ts.Statement): Option.Option<ts.Statement> =>
  Option.flatMap(Option.liftPredicate(ts.isBlock)(statement.parent), (block) => {
    const statementIndex = block.statements.indexOf(statement)

    return Option.fromNullable(block.statements[statementIndex - 1])
  })

const haveIdenticalBodies = (
  context: RuleContext,
  firstIfStatement: ts.IfStatement,
  secondIfStatement: ts.IfStatement
): boolean =>
  bodyFingerprint(context.sourceFile, firstIfStatement.thenStatement) ===
  bodyFingerprint(context.sourceFile, secondIfStatement.thenStatement)

const bodyFingerprint = (sourceFile: ts.SourceFile, statement: ts.Statement): string =>
  tokenTexts(sourceFile, unwrapSingleStatementBlock(statement)).join(" ")

const tokenTexts = (sourceFile: ts.SourceFile, node: ts.Node): ReadonlyArray<string> => {
  if (node.kind === ts.SyntaxKind.SemicolonToken) {
    return []
  }

  const children = node.getChildren(sourceFile)
  const isLeafToken = children.length === 0

  return isLeafToken
    ? [node.getText(sourceFile)]
    : children.flatMap((child) => tokenTexts(sourceFile, child))
}

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
  Option.match(lastStatement(block), {
    onNone: () => false,
    onSome: alwaysExitsScope
  })

const lastStatement = (block: ts.Block): Option.Option<ts.Statement> =>
  Option.fromNullable(block.statements[block.statements.length - 1])

const toDuplicateMatch = (
  context: RuleContext,
  firstIfStatement: ts.IfStatement,
  ifStatement: ts.IfStatement
): DuplicateIfBodyMatch => ({
  ifStatement,
  combinedCondition: [
    firstIfStatement.expression.getText(context.sourceFile),
    ifStatement.expression.getText(context.sourceFile)
  ].join(" || ")
})
