import { Array, Function, Option, Schema, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { alwaysExitsScope } from "../support/alwaysExitsScope.js"
import { unwrapSingleStatementBlock } from "../support/unwrapSingleStatementBlock.js"
import { strictEqual } from "../equivalence.js"

// NoDuplicateIfBodiesFact exists because its fields form one stable data contract used by the linter.
export const NoDuplicateIfBodiesFact = Schema.Struct({
  combinedCondition: Schema.String
})

export interface NoDuplicateIfBodiesFact extends Schema.Schema.Type<
  typeof NoDuplicateIfBodiesFact
> {}

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
    if (strictEqual(ts.SyntaxKind.SemicolonToken)(node.kind)) {
      return Array.empty()
    }

    const children = node.getChildren(sourceFile)
    const isLeafToken = strictEqual(0)(children.length)
    const nodeText = node.getText(sourceFile)
    return isLeafToken ? Array.of(nodeText) : Array.flatMap(children, tokenTexts(sourceFile))
  }

const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)

const duplicateIfBodiesMatches = (context: MatchContext) => {
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

    return strictEqual(secondFingerprint)(firstFingerprint)
  }

  const makeCombinedConditionFact =
    (firstIfStatement: ts.IfStatement) => (ifStatement: ts.IfStatement) => {
      const firstCondition = conditionText(firstIfStatement)
      const secondCondition = conditionText(ifStatement)
      const conditionTexts = Array.make(firstCondition, secondCondition)
      const combinedCondition = Array.join(conditionTexts, " || ")

      return NoDuplicateIfBodiesFact.make({ combinedCondition })
    }

  const guardDup =
    (ifStatement: ts.IfStatement) =>
    (previousIfStatement: ts.IfStatement): Option.Option<NoDuplicateIfBodiesFact> => {
      const hasDuplicateBody = sameBody(previousIfStatement)(ifStatement)
      const bodyExitsScope = alwaysExitsScope(ifStatement.thenStatement)
      const mergeableDuplicateConditions = Array.make(hasDuplicateBody, bodyExitsScope)
      const isMergeableDuplicate = Array.every(mergeableDuplicateConditions, Boolean)
      const fact = makeCombinedConditionFact(previousIfStatement)(ifStatement)

      return isMergeableDuplicate ? Option.some(fact) : Option.none()
    }

  const parentDup =
    (ifStatement: ts.IfStatement) =>
    (parentIfStatement: ts.IfStatement): Option.Option<NoDuplicateIfBodiesFact> => {
      const hasDuplicateBody = sameBody(parentIfStatement)(ifStatement)
      const fact = makeCombinedConditionFact(parentIfStatement)(ifStatement)

      return hasDuplicateBody ? Option.some(fact) : Option.none()
    }

  const matchIfStatement = (ifStatement: ts.IfStatement) => {
    const isCurrentIfStatement = strictEqual(ifStatement)

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

    const isElseOfParent = flow(
      Struct.get<ts.IfStatement, "elseStatement">("elseStatement"),
      strictEqual(ifStatement)
    )

    const bodyMatch = Option.isSome(guardDuplicateMatch)
      ? guardDuplicateMatch
      : pipe(
          Option.liftPredicate(ts.isIfStatement)(ifStatement.parent),
          Option.filter(isElseOfParent),
          Option.flatMap(parentDup(ifStatement))
        )

    const matchWithFact = (fact: NoDuplicateIfBodiesFact) => makeNodeMatch(ifStatement, fact)
    return pipe(bodyMatch, Option.map(matchWithFact), Option.toArray)
  }

  return matchIfStatement
}

export const noDuplicateIfBodiesScanner = makeNodeScanner(ifStatementKinds)(ts.isIfStatement)(
  duplicateIfBodiesMatches
)
