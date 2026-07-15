import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import { alwaysExitsScope, unwrapSingleStatementBlock } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

const isGuardIfStatement = (statement: ts.Statement): statement is ts.IfStatement =>
  pipe(
    Option.liftPredicate(ts.isIfStatement)(statement),
    Option.exists(
      Function.flow(
        (ifStatement: ts.IfStatement) => Option.fromNullable(ifStatement.elseStatement),
        Option.isNone
      )
    )
  )

const tokenTexts =
  (sourceFile: ts.SourceFile) =>
  (node: ts.Node): ReadonlyArray<string> => {
    if (node.kind === ts.SyntaxKind.SemicolonToken) {
      return Array.empty()
    }

    const children = node.getChildren(sourceFile)
    const isLeafToken = children.length === 0
    const nodeText = node.getText(sourceFile)
    return isLeafToken ? Array.of(nodeText) : Array.flatMap(children, tokenTexts(sourceFile))
  }

const duplicateIfMatches = (context: CheckContext) => {
  const fingerprint = (statement: ts.Statement): string => {
    const unwrappedBody = unwrapSingleStatementBlock(statement)
    const textsForFile = tokenTexts(context.sourceFile)
    const tokens = textsForFile(unwrappedBody)

    return Array.join(tokens, " ")
  }

  const conditionText = (ifStatement: ts.IfStatement): string =>
    ifStatement.expression.getText(context.sourceFile)

  const sameBody =
    (firstIfStatement: ts.IfStatement) =>
    (secondIfStatement: ts.IfStatement): boolean =>
      fingerprint(firstIfStatement.thenStatement) === fingerprint(secondIfStatement.thenStatement)

  const combineConditions =
    (firstIfStatement: ts.IfStatement) =>
    (ifStatement: ts.IfStatement): string => {
      const firstCondition = conditionText(firstIfStatement)
      const secondCondition = conditionText(ifStatement)
      const conditionTexts = Array.make(firstCondition, secondCondition)

      return Array.join(conditionTexts, " || ")
    }

  const guardDup =
    (ifStatement: ts.IfStatement) =>
    (previousIfStatement: ts.IfStatement): Option.Option<string> => {
      const hasDuplicateBody = sameBody(previousIfStatement)(ifStatement)
      const bodyExitsScope = alwaysExitsScope(ifStatement.thenStatement)
      const mergeableDuplicateConditions = Array.make(hasDuplicateBody, bodyExitsScope)
      const isMergeableDuplicate = Array.every(mergeableDuplicateConditions, Boolean)
      const combinedCondition = combineConditions(previousIfStatement)(ifStatement)

      return isMergeableDuplicate ? Option.some(combinedCondition) : Option.none()
    }

  const parentDup =
    (ifStatement: ts.IfStatement) =>
    (parentIfStatement: ts.IfStatement): Option.Option<string> => {
      const hasDuplicateBody = sameBody(parentIfStatement)(ifStatement)
      const combinedCondition = combineConditions(parentIfStatement)(ifStatement)

      return hasDuplicateBody ? Option.some(combinedCondition) : Option.none()
    }

  const match = detection(context)

  const ruleMatch =
    (ifStatement: ts.IfStatement) =>
    (combinedCondition: string): Detection =>
      match({
        node: ifStatement,
        message: "Avoid if branches that repeat the body of the branch before them.",
        hint:
          "These branches are pseudo-duplicates: the bodies are identical and only the " +
          "conditions differ. Combine them into a single branch: " +
          `if (${combinedCondition}) { ... }.`
      })

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<Detection> => {
    const guardDuplicateMatch = isGuardIfStatement(ifStatement)
      ? pipe(
          Option.liftPredicate(ts.isBlock)(ifStatement.parent),
          Option.flatMap((block: ts.Block) =>
            pipe(
              Array.findFirstIndex(block.statements, (statement) => statement === ifStatement),
              Option.flatMap((statementIndex) =>
                Option.fromNullable(block.statements[statementIndex - 1])
              )
            )
          ),
          Option.filter(isGuardIfStatement),
          Option.flatMap(guardDup(ifStatement))
        )
      : Option.none()

    const bodyMatch = Option.isSome(guardDuplicateMatch)
      ? guardDuplicateMatch
      : pipe(
          Option.liftPredicate(ts.isIfStatement)(ifStatement.parent),
          Option.filter((parent: ts.IfStatement): boolean => parent.elseStatement === ifStatement),
          Option.flatMap(parentDup(ifStatement))
        )

    return pipe(bodyMatch, Option.map(ruleMatch(ifStatement)), Option.toArray)
  }

  return matches
}

const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)
const check = nodeCheck(ifStatementKinds)(ts.isIfStatement)(duplicateIfMatches)

export const noDuplicateIfBodies: Check = check

export const noDuplicateIfBodiesExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-duplicate-if-bodies")
