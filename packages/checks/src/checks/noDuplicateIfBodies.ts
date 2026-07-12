import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import {
  alwaysExitsScope,
  hasNoElseBranch,
  unwrapSingleStatementBlock
} from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
const isGuardIfStatement = (
  statement: ts.Statement
): statement is ts.IfStatement =>
  ts.isIfStatement(statement) && hasNoElseBranch(statement)

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

const duplicateIfMatches = (context: CheckContext) => {
  const fingerprint = (statement: ts.Statement): string => {
    const unwrappedBody = unwrapSingleStatementBlock(statement)

    return tokenTexts(context.sourceFile)(unwrappedBody).join(" ")
  }
  const conditionText = (ifStatement: ts.IfStatement): string =>
    ifStatement.expression.getText(context.sourceFile)
  const sameBody =
    (firstIfStatement: ts.IfStatement) =>
    (secondIfStatement: ts.IfStatement): boolean =>
      fingerprint(firstIfStatement.thenStatement) ===
      fingerprint(secondIfStatement.thenStatement)
  const combineConditions =
    (firstIfStatement: ts.IfStatement) =>
    (ifStatement: ts.IfStatement): string =>
      [conditionText(firstIfStatement), conditionText(ifStatement)].join(" || ")
  const guardDup =
    (ifStatement: ts.IfStatement) =>
    (previousIfStatement: ts.IfStatement): Option.Option<string> => {
      const hasDuplicateBody = sameBody(previousIfStatement)(ifStatement)
      const bodyExitsScope = alwaysExitsScope(ifStatement.thenStatement)
      const isMergeableDuplicate = [hasDuplicateBody, bodyExitsScope].every(
        Boolean
      )
      const combinedCondition =
        combineConditions(previousIfStatement)(ifStatement)

      return isMergeableDuplicate
        ? Option.some(combinedCondition)
        : Option.none()
    }
  const parentDup =
    (ifStatement: ts.IfStatement) =>
    (parentIfStatement: ts.IfStatement): Option.Option<string> => {
      const hasDuplicateBody = sameBody(parentIfStatement)(ifStatement)
      const combinedCondition =
        combineConditions(parentIfStatement)(ifStatement)

      return hasDuplicateBody ? Option.some(combinedCondition) : Option.none()
    }
  const match = detection(context)
  const ruleMatch =
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

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<Detection> => {
    const guardDuplicateMatch = isGuardIfStatement(ifStatement)
      ? pipe(
          Option.liftPredicate(ts.isBlock)(ifStatement.parent),
          Option.flatMap((block: ts.Block) => {
            const statementIndex = block.statements.indexOf(ifStatement)

            return Option.fromNullable(block.statements[statementIndex - 1])
          }),
          Option.filter(isGuardIfStatement),
          Option.flatMap(guardDup(ifStatement))
        )
      : Option.none()

    const bodyMatch = Option.isSome(guardDuplicateMatch)
      ? guardDuplicateMatch
      : pipe(
          Option.liftPredicate(ts.isIfStatement)(ifStatement.parent),
          Option.filter(
            (parent: ts.IfStatement): boolean =>
              parent.elseStatement === ifStatement
          ),
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
