import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import {
  alwaysExitsScope,
  hasNoElseBranch,
  unwrapSingleStatementBlock
} from "./support/tsNode.js"
import { detection } from "../engine/location.js"
import type { MakeDetection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"
import {
  fixtureRefactorExamples
} from "../engine/example.js"
import type { NonEmptyRefactorExamples } from "../engine/example.js"

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

const bodyFingerprint =
  (sourceFile: ts.SourceFile) =>
  (statement: ts.Statement): string => {
    const unwrappedBody = unwrapSingleStatementBlock(statement)

    return tokenTexts(sourceFile)(unwrappedBody).join(" ")
  }

type StatementFingerprint = (statement: ts.Statement) => string
type ConditionText = (ifStatement: ts.IfStatement) => string

const haveIdenticalBodies =
  (fingerprint: StatementFingerprint) =>
  (firstIfStatement: ts.IfStatement) =>
  (secondIfStatement: ts.IfStatement): boolean =>
    fingerprint(firstIfStatement.thenStatement) ===
    fingerprint(secondIfStatement.thenStatement)

const combinedConditionText =
  (conditionText: ConditionText) =>
  (firstIfStatement: ts.IfStatement) =>
  (ifStatement: ts.IfStatement): string =>
    [conditionText(firstIfStatement), conditionText(ifStatement)].join(" || ")

type IfComparator = (
  firstIfStatement: ts.IfStatement
) => (secondIfStatement: ts.IfStatement) => boolean
type IfConditionCombiner = (
  firstIfStatement: ts.IfStatement
) => (ifStatement: ts.IfStatement) => string

const guardDuplicate =
  (sameBody: IfComparator) =>
  (combineConditions: IfConditionCombiner) =>
  (ifStatement: ts.IfStatement) =>
  (previousIfStatement: ts.IfStatement): Option.Option<string> => {
    const hasDuplicateBody = sameBody(previousIfStatement)(ifStatement)
    const bodyExitsScope = alwaysExitsScope(ifStatement.thenStatement)
    const isMergeableDuplicate = [hasDuplicateBody, bodyExitsScope].every(
      Boolean
    )
    const combinedCondition =
      combineConditions(previousIfStatement)(ifStatement)

    return isMergeableDuplicate ? Option.some(combinedCondition) : Option.none()
  }

const isElseOf =
  (ifStatement: ts.IfStatement) =>
  (parent: ts.IfStatement): boolean =>
    parent.elseStatement === ifStatement

const parentBodyDuplicate =
  (sameBody: IfComparator) =>
  (combineConditions: IfConditionCombiner) =>
  (ifStatement: ts.IfStatement) =>
  (parentIfStatement: ts.IfStatement): Option.Option<string> => {
    const hasDuplicateBody = sameBody(parentIfStatement)(ifStatement)
    const combinedCondition = combineConditions(parentIfStatement)(ifStatement)

    return hasDuplicateBody ? Option.some(combinedCondition) : Option.none()
  }

const duplicateIfDetection =
  (match: MakeDetection) =>
  (ifStatement: ts.IfStatement) =>
  (combinedCondition: string): Detection =>
    match({
      node: ifStatement,
      message:
        "Avoid if branches that repeat the body of the branch before them.",
      hint:
        "These branches are pseudo-duplicates: the bodies are identical and only the " +
        "conditions differ. Combine them into a single branch: " +
        `if (${combinedCondition}) { ... }.`
    })

const duplicateIfMatches = (context: CheckContext) => {
  const fingerprint = bodyFingerprint(context.sourceFile)
  const conditionText = (ifStatement: ts.IfStatement): string =>
    ifStatement.expression.getText(context.sourceFile)
  const sameBody = haveIdenticalBodies(fingerprint)
  const combineConditions = combinedConditionText(conditionText)
  const guardDup = guardDuplicate(sameBody)(combineConditions)
  const parentDup = parentBodyDuplicate(sameBody)(combineConditions)
  const ruleMatch = duplicateIfDetection(detection(context))

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<Detection> => {
    const guardDuplicateMatch = isGuardIfStatement(ifStatement)
      ? pipe(
          Option.liftPredicate(ts.isBlock)(ifStatement.parent),
          Option.flatMap(statementBefore(ifStatement)),
          Option.filter(isGuardIfStatement),
          Option.flatMap(guardDup(ifStatement))
        )
      : Option.none()

    const bodyMatch = Option.isSome(guardDuplicateMatch)
      ? guardDuplicateMatch
      : pipe(
          Option.liftPredicate(ts.isIfStatement)(ifStatement.parent),
          Option.filter(isElseOf(ifStatement)),
          Option.flatMap(parentDup(ifStatement))
        )

    return pipe(bodyMatch, Option.map(ruleMatch(ifStatement)), Option.toArray)
  }

  return matches
}

const check = nodeCheck([ts.SyntaxKind.IfStatement])(ts.isIfStatement)(
  duplicateIfMatches
)

export const noDuplicateIfBodies: Check = check

export const noDuplicateIfBodiesExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-duplicate-if-bodies")
