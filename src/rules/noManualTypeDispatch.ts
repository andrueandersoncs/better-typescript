import { Array, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { alwaysExitsScope, hasNoElseBranch } from "./tsNode.js"
import { detection } from "../detectors/location.js"
import type { MakeDetection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

// A dispatch chain shorter than this reads as a couple of ordinary early-return guards, not a hand-rolled match.
const minimumChainLength = 3

// A guard is a branchless if whose body always leaves the scope, so successive guards form a flat dispatch ladder.
const isDispatchGuard = (
  statement: ts.Statement
): statement is ts.IfStatement => {
  const isIf = ts.isIfStatement(statement)
  const isBranchless = isIf && hasNoElseBranch(statement)

  return isBranchless && alwaysExitsScope(statement.thenStatement)
}

const identifierNames = (node: ts.Node): ReadonlyArray<string> => {
  const ownNames = ts.isIdentifier(node) ? [node.text] : []
  const childNames = node.getChildren().flatMap(identifierNames)

  return Array.appendAll(ownNames, childNames)
}

// The discriminants are the identifiers a guard inspects, e.g. `node` in `Schema.is(StepNode)(node)`.
const discriminants = (
  ifStatement: ts.IfStatement
): HashSet.HashSet<string> => {
  const names = identifierNames(ifStatement.expression)

  return HashSet.fromIterable(names)
}

const memberOf =
  (names: HashSet.HashSet<string>) =>
  (name: string): boolean =>
    HashSet.has(names, name)

const statementAt =
  (offset: number) =>
  (ifStatement: ts.IfStatement): Option.Option<ts.Statement> => {
    const block = ifStatement.parent
    if (!ts.isBlock(block)) {
      return Option.none()
    }

    const index = block.statements.indexOf(ifStatement)

    return Option.fromNullable(block.statements[index + offset])
  }

const siblingDispatchGuard =
  (offset: number) =>
  (ifStatement: ts.IfStatement): Option.Option<ts.IfStatement> =>
    pipe(statementAt(offset)(ifStatement), Option.filter(isDispatchGuard))

const sharesSubjectWith =
  (ifStatement: ts.IfStatement) =>
  (sibling: ts.IfStatement): boolean => {
    const firstDiscriminants = discriminants(ifStatement)
    const secondDiscriminants = discriminants(sibling)

    return HashSet.some(firstDiscriminants, memberOf(secondDiscriminants))
  }

const continuesChain =
  (offset: number) =>
  (ifStatement: ts.IfStatement): boolean =>
    pipe(
      siblingDispatchGuard(offset)(ifStatement),
      Option.exists(sharesSubjectWith(ifStatement))
    )

// A chain head shares a subject with the next guard but not with any prior guard, so only the head reports.
const isChainHead = (ifStatement: ts.IfStatement): boolean => {
  const precedesAnotherGuard = continuesChain(1)(ifStatement)
  const startsTheChain = !continuesChain(-1)(ifStatement)

  return precedesAnotherGuard && startsTheChain
}

const oneMoreThanRest = (next: ts.IfStatement): number =>
  1 + chainLengthFrom(next)

const chainLengthFrom = (ifStatement: ts.IfStatement): number =>
  continuesChain(1)(ifStatement)
    ? pipe(
        siblingDispatchGuard(1)(ifStatement),
        Option.map(oneMoreThanRest),
        Option.getOrElse(returnsOne)
      )
    : 1

const returnsOne = (): number => 1

const isLongEnough = (head: ts.IfStatement): boolean =>
  chainLengthFrom(head) >= minimumChainLength

const manualTypeDispatchMatch =
  (match: MakeDetection) =>
  (ifStatement: ts.IfStatement): Detection =>
    match({
      node: ifStatement,
      message:
        "Avoid dispatching on a value with a chain of if statements that each return.",
      hint:
        "This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) " +
        "with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile " +
        "error rather than a silent fall-through."
    })

// The context stage runs once per file, so the hoisted match partial is shared by all IfStatements the report wiring feeds to matches.
const manualTypeDispatchMatches = (context: RuleContext) => {
  const ruleMatch = manualTypeDispatchMatch(detection(context))

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<Detection> =>
    pipe(
      Option.liftPredicate(isDispatchGuard)(ifStatement),
      Option.filter(isChainHead),
      Option.filter(isLongEnough),
      Option.map(ruleMatch),
      Option.toArray
    )

  return matches
}

const check = nodeCheck([ts.SyntaxKind.IfStatement])(ts.isIfStatement)(
  manualTypeDispatchMatches
)

export const noManualTypeDispatch: RuleCheck = check
