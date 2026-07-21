import { Array, Function, Option, pipe, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"
import { alwaysExitsScope, unwrapSingleStatementBlock } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

// NoDuplicateIfBodiesFact carries the merged condition because guidance quotes the combined branch.
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

    const factForCondition = (combinedCondition: string) =>
      NoDuplicateIfBodiesFact.make({
        combinedCondition
      })

    const matchWithFact = (fact: NoDuplicateIfBodiesFact) => nodeMatch(ifStatement, fact)

    return pipe(bodyMatch, Option.map(factForCondition), Option.map(matchWithFact), Option.toArray)
  }

  return matchIfStatement
}

export const noDuplicateIfBodiesMatcher = nodeMatcher(ifStatementKinds)(ts.isIfStatement)(
  duplicateIfBodiesMatches
)
