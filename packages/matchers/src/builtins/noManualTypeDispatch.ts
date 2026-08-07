import { Array, Function, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import { isDispatchGuard } from "./isDispatchGuard.js"
import { siblingDispatchGuard } from "./siblingDispatchGuard.js"
import { continuesChain } from "./continuesChain.js"

// NoManualTypeDispatchFact is empty payload because guidance and matchers share identity.
export const NoManualTypeDispatchFact = Schema.Struct({})

export interface NoManualTypeDispatchFact extends Schema.Schema.Type<
  typeof NoManualTypeDispatchFact
> {}

// emptyNoManualTypeDispatchFact is empty payload because guidance and matchers share identity.
export const emptyNoManualTypeDispatchFact = NoManualTypeDispatchFact.make({})

// Require this many branches because shorter chains look like early-return guards, not a match.
const minimumChainLength = 3

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

const ifStatementKinds = Array.of(ts.SyntaxKind.IfStatement)

const makeManualTypeDispatchMatch = (node: ts.IfStatement) =>
  makeNodeMatch(node, emptyNoManualTypeDispatchFact)

const matchManualTypeDispatch = (ifStatement: ts.IfStatement) =>
  pipe(
    Option.liftPredicate(isDispatchGuard)(ifStatement),
    Option.filter(isChainHead),
    Option.filter(isLongEnough),
    Option.map(makeManualTypeDispatchMatch),
    Option.toArray
  )

const noManualTypeDispatchMatches = Function.constant(matchManualTypeDispatch)

export const noManualTypeDispatchMatcher = nodeMatcher(ifStatementKinds)(ts.isIfStatement)(
  noManualTypeDispatchMatches
)
