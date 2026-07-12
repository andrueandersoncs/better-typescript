import { Array, Function, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { alwaysExitsScope, hasNoElseBranch } from "./support/tsNode.js"
import { detection } from "../engine/location.js"
import type { MakeDetection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"

// Require this many branches because shorter chains read as ordinary early-return guards rather than a hand-rolled match.
const minimumChainLength = 3

// Treat branchless exiting if statements as guards because successive guards form a flat dispatch ladder.
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

// Compare guard discriminants because a dispatch ladder must inspect the same subject.
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

// Report only the chain head because it shares a subject with the next guard but not a prior guard.
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

const returnsOne: () => number = Function.constant(1)

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

const manualTypeDispatchMatches = (context: CheckContext) => {
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

export const noManualTypeDispatch: Check = check
