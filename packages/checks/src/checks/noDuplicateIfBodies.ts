import { Array, Function, Option, pipe, Struct } from "effect"
import * as ts from "typescript"
import { alwaysExitsScope, unwrapSingleStatementBlock } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const elseStatement = Function.flow(
  Struct.get<ts.IfStatement, "elseStatement">("elseStatement"),
  Option.fromNullishOr
)

const isGuardIfStatement = (statement: ts.Statement): statement is ts.IfStatement =>
  pipe(
    Option.liftPredicate(ts.isIfStatement)(statement),
    Option.exists(Function.flow(elseStatement, Option.isNone))
  )

const tokenTexts =
  (sourceFile: ts.SourceFile) =>
  (node: ts.Node): ReadonlyArray<string> => {
    if (strictEqual(node.kind, ts.SyntaxKind.SemicolonToken)) {
      return Array.empty()
    }

    const children = node.getChildren(sourceFile)
    const isLeafToken = strictEqual(children.length, 0)
    const nodeText = node.getText(sourceFile)
    return isLeafToken ? Array.of(nodeText) : Array.flatMap(children, tokenTexts(sourceFile))
  }

const duplicateIfMatches = (context: CheckContext) => {
  const fingerprint = (statement: ts.Statement) => {
    const unwrappedBody = unwrapSingleStatementBlock(statement)
    const textsForFile = tokenTexts(context.sourceFile)
    const tokens = textsForFile(unwrappedBody)

    return Array.join(tokens, " ")
  }

  const conditionText = (ifStatement: ts.IfStatement) =>
    ifStatement.expression.getText(context.sourceFile)

  const sameBody = (firstIfStatement: ts.IfStatement) => (secondIfStatement: ts.IfStatement) => {
    const firstFingerprint = fingerprint(firstIfStatement.thenStatement)
    const secondFingerprint = fingerprint(secondIfStatement.thenStatement)

    return strictEqual(firstFingerprint, secondFingerprint)
  }

  const combineConditions = (firstIfStatement: ts.IfStatement) => (ifStatement: ts.IfStatement) => {
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

  const match = makeDetection(context)

  const ruleMatch = (ifStatement: ts.IfStatement) => (combinedCondition: string) =>
    match({
      node: ifStatement,
      message: "Avoid if branches that repeat the body of the branch before them.",
      hint:
        "These branches are pseudo-duplicates: the bodies are identical and only the " +
        "conditions differ. Combine them into a single branch: " +
        `if (${combinedCondition}) { ... }.`
    })

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<Detection> => {
    const isCurrentIfStatement = (statement: ts.Statement) => strictEqual(statement, ifStatement)

    const statementBefore = (block: ts.Block) => (statementIndex: number) =>
      Option.fromNullishOr(block.statements[statementIndex - 1])

    const previousGuardStatement = (block: ts.Block) =>
      pipe(
        Array.findFirstIndex(block.statements, isCurrentIfStatement),
        Option.flatMap(statementBefore(block))
      )

    const guardDuplicateMatch = isGuardIfStatement(ifStatement)
      ? pipe(
          Option.liftPredicate(ts.isBlock)(ifStatement.parent),
          Option.flatMap(previousGuardStatement),
          Option.filter(isGuardIfStatement),
          Option.flatMap(guardDup(ifStatement))
        )
      : Option.none()

    const isElseOfParent = (parent: ts.IfStatement) =>
      strictEqual(parent.elseStatement, ifStatement)

    const bodyMatch = Option.isSome(guardDuplicateMatch)
      ? guardDuplicateMatch
      : pipe(
          Option.liftPredicate(ts.isIfStatement)(ifStatement.parent),
          Option.filter(isElseOfParent),
          Option.flatMap(parentDup(ifStatement))
        )

    return pipe(bodyMatch, Option.map(ruleMatch(ifStatement)), Option.toArray)
  }

  return matches
}

const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)

export const noDuplicateIfBodies = makeCheck(
  "no-duplicate-if-bodies",
  ifStatementKinds,
  ts.isIfStatement,
  duplicateIfMatches
)
