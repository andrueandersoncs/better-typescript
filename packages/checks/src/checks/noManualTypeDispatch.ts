import { Array, Function, HashSet, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { alwaysExitsScope } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
// Require this many branches because shorter chains read as ordinary early-return guards rather than a hand-rolled match.
const minimumChainLength = 3

// Treat branchless exiting if statements as guards because successive guards form a flat dispatch ladder.
const isDispatchGuard = (
  statement: ts.Statement
): statement is ts.IfStatement =>
  pipe(
    Option.liftPredicate(ts.isIfStatement)(statement),
    Option.exists((ifStatement) => {
      const elseBranch = Option.fromNullable(ifStatement.elseStatement)
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
const discriminants = (ifStatement: ts.IfStatement): HashSet.HashSet<string> =>
  pipe(identifierNames(ifStatement.expression), HashSet.fromIterable)

const siblingDispatchGuard =
  (offset: number) =>
  (ifStatement: ts.IfStatement): Option.Option<ts.IfStatement> => {
    const block = ifStatement.parent
    if (!ts.isBlock(block)) {
      return Option.none()
    }

    return pipe(
      Array.findFirstIndex(
        block.statements,
        (statement) => statement === ifStatement
      ),
      Option.map((index) => index + offset),
      Option.flatMap((index) => Option.fromNullable(block.statements[index])),
      Option.filter(isDispatchGuard)
    )
  }

const continuesChain =
  (offset: number) =>
  (ifStatement: ts.IfStatement): boolean =>
    pipe(
      siblingDispatchGuard(offset)(ifStatement),
      Option.exists((sibling) => {
        const firstDiscriminants = discriminants(ifStatement)
        const secondDiscriminants = discriminants(sibling)

        return HashSet.some(firstDiscriminants, (name) =>
          HashSet.has(secondDiscriminants, name)
        )
      })
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

const manualTypeDispatchMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (ifStatement: ts.IfStatement): ReadonlyArray<Detection> =>
    pipe(
      Option.liftPredicate(isDispatchGuard)(ifStatement),
      Option.filter(isChainHead),
      Option.filter(isLongEnough),
      Option.map((node) =>
        match({
          node,
          message:
            "Avoid dispatching on a value with a chain of if statements that each return.",
          hint:
            "This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) " +
            "with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile " +
            "error rather than a silent fall-through."
        })
      ),
      Option.toArray
    )

  return matches
}

const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)

const check = nodeCheck(ifStatementKinds)(ts.isIfStatement)(
  manualTypeDispatchMatches
)

export const noManualTypeDispatch: Check = check

export const noManualTypeDispatchExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-manual-type-dispatch")
