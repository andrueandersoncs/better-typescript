import { Array, Function, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { alwaysExitsScope } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

// Require this many branches because shorter chains look like early-return guards, not a match.
const minimumChainLength = 3

// Treat branchless exiting ifs as guards because successive guards form a flat dispatch ladder.
const isDispatchGuard = (statement: ts.Statement): statement is ts.IfStatement =>
  pipe(
    Option.liftPredicate(ts.isIfStatement)(statement),
    Option.exists((ifStatement) => {
      const elseBranch = Option.fromNullishOr(ifStatement.elseStatement)
      const isBranchless = Option.isNone(elseBranch)

      return isBranchless && alwaysExitsScope(ifStatement.thenStatement)
    })
  )

const identifierNames = (node: ts.Node): ReadonlyArray<string> => {
  const ownNames = ts.isIdentifier(node) ? Array.of(node.text) : Array.empty()
  const children = node.getChildren()
  const childNames = Array.flatMap(children, identifierNames)

  return Array.appendAll(ownNames, childNames)
}

// Compare guard discriminants because a dispatch ladder must inspect the same subject.
const discriminants = (ifStatement: ts.IfStatement) =>
  pipe(identifierNames(ifStatement.expression), HashSet.fromIterable)

const siblingDispatchGuard =
  (offset: number) =>
  (ifStatement: ts.IfStatement): Option.Option<ts.IfStatement> => {
    const block = ifStatement.parent
    if (!ts.isBlock(block)) {
      return Option.none()
    }

    const isCurrentIfStatement = (statement: ts.Statement) => strictEqual(statement, ifStatement)
    const statementAtOffset = (index: number) => Option.fromNullishOr(block.statements[index])

    return pipe(
      Array.findFirstIndex(block.statements, isCurrentIfStatement),
      Option.map((index) => index + offset),
      Option.flatMap(statementAtOffset),
      Option.filter(isDispatchGuard)
    )
  }

const continuesChain = (offset: number) => (ifStatement: ts.IfStatement) => {
  const sharesDiscriminant = (sibling: ts.IfStatement) => {
    const firstDiscriminants = discriminants(ifStatement)
    const secondDiscriminants = discriminants(sibling)
    const secondHasName = (name: string) => HashSet.has(secondDiscriminants, name)

    return HashSet.some(firstDiscriminants, secondHasName)
  }

  return pipe(siblingDispatchGuard(offset)(ifStatement), Option.exists(sharesDiscriminant))
}

// Report only the chain head because it shares a subject with the next guard but not a prior guard.
const isChainHead = (ifStatement: ts.IfStatement) => {
  const precedesAnotherGuard = continuesChain(1)(ifStatement)
  const startsTheChain = !continuesChain(-1)(ifStatement)

  return precedesAnotherGuard && startsTheChain
}

const oneMoreThanRest = (next: ts.IfStatement): number => 1 + chainLengthFrom(next)

const chainLengthFrom = (ifStatement: ts.IfStatement): number =>
  continuesChain(1)(ifStatement)
    ? pipe(
        siblingDispatchGuard(1)(ifStatement),
        Option.map(oneMoreThanRest),
        Option.getOrElse(returnsOne)
      )
    : 1

const returnsOne: () => number = Function.constant(1)

const isLongEnough = Function.flow(chainLengthFrom, (length) => length >= minimumChainLength)

const manualTypeDispatchMatches = (context: CheckContext) => {
  const match = makeDetection(context)

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<Detection> => {
    const dispatchDetection = (node: ts.IfStatement) =>
      match({
        node,
        message: "Avoid dispatching on a value with a chain of if statements that each return.",
        hint:
          "This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) " +
          "with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile " +
          "error rather than a silent fall-through."
      })

    return pipe(
      Option.liftPredicate(isDispatchGuard)(ifStatement),
      Option.filter(isChainHead),
      Option.filter(isLongEnough),
      Option.map(dispatchDetection),
      Option.toArray
    )
  }

  return matches
}

const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)

export const noManualTypeDispatch = makeCheck(
  "no-manual-type-dispatch",
  ifStatementKinds,
  ts.isIfStatement,
  manualTypeDispatchMatches
)
