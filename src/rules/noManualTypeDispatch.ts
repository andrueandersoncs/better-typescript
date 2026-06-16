import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { alwaysExitsScope, hasNoElseBranch } from "./tsNode.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-manual-type-dispatch"

// A dispatch chain shorter than this reads as a couple of ordinary early-return guards, not a hand-rolled match.
const minimumChainLength = 3

// A guard is a branchless if whose body always leaves the scope, so successive guards form a flat dispatch ladder.
const isDispatchGuard = (statement: ts.Statement): statement is ts.IfStatement => {
  const isIf = ts.isIfStatement(statement)
  const isBranchless = isIf && hasNoElseBranch(statement)

  return isBranchless && alwaysExitsScope(statement.thenStatement)
}

const ownIdentifierName = (node: ts.Node): ReadonlyArray<string> =>
  ts.isIdentifier(node) ? [node.text] : []

const identifierNames = (node: ts.Node): ReadonlyArray<string> => {
  const childNames = node.getChildren().flatMap(identifierNames)

  return [...ownIdentifierName(node), ...childNames]
}

// The discriminants are the identifiers a guard inspects, e.g. `node` in `Schema.is(StepNode)(node)`.
const discriminants = (ifStatement: ts.IfStatement): ReadonlySet<string> => {
  const names = identifierNames(ifStatement.expression)

  return new Set(names)
}

const memberOf =
  (names: ReadonlySet<string>) =>
  (name: string): boolean =>
    names.has(name)

const sharesDiscriminant = (
  first: ReadonlySet<string>,
  second: ReadonlySet<string>
): boolean => [...first].some(memberOf(second))

const guardsShareSubject = (first: ts.IfStatement, second: ts.IfStatement): boolean => {
  const firstDiscriminants = discriminants(first)
  const secondDiscriminants = discriminants(second)

  return sharesDiscriminant(firstDiscriminants, secondDiscriminants)
}

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
    statementAt(offset)(ifStatement).pipe(Option.filter(isDispatchGuard))

const sharesSubjectWith =
  (ifStatement: ts.IfStatement) =>
  (sibling: ts.IfStatement): boolean =>
    guardsShareSubject(ifStatement, sibling)

const continuesChain =
  (offset: number) =>
  (ifStatement: ts.IfStatement): boolean =>
    siblingDispatchGuard(offset)(ifStatement).pipe(
      Option.exists(sharesSubjectWith(ifStatement))
    )

// A chain head shares a subject with the next guard but not with any prior guard, so only the head reports.
const isChainHead = (ifStatement: ts.IfStatement): boolean => {
  const precedesAnotherGuard = continuesChain(1)(ifStatement)
  const startsTheChain = !continuesChain(-1)(ifStatement)

  return precedesAnotherGuard && startsTheChain
}

const oneMoreThanRest = (next: ts.IfStatement): number => 1 + chainLengthFrom(next)

const chainLengthFrom = (ifStatement: ts.IfStatement): number =>
  continuesChain(1)(ifStatement)
    ? siblingDispatchGuard(1)(ifStatement).pipe(
        Option.map(oneMoreThanRest),
        Option.getOrElse(returnsOne)
      )
    : 1

const returnsOne = (): number => 1

const isLongEnough = (head: ts.IfStatement): boolean =>
  chainLengthFrom(head) >= minimumChainLength

const dispatchChainHead = (ifStatement: ts.IfStatement): Option.Option<ts.IfStatement> =>
  Option.liftPredicate(isDispatchGuard)(ifStatement).pipe(
    Option.filter(isChainHead),
    Option.filter(isLongEnough)
  )

const manualTypeDispatchMatch =
  (context: RuleContext) =>
  (ifStatement: ts.IfStatement): RuleMatch =>
    createRuleMatch(context, {
      ruleId,
      node: ifStatement,
      message: "Avoid dispatching on a value with a chain of if statements that each return.",
      hint:
        "This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) " +
        "with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile " +
        "error rather than a silent fall-through."
    })

const manualTypeDispatchMatches = (
  ifStatement: ts.IfStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  dispatchChainHead(ifStatement).pipe(
    Option.map(manualTypeDispatchMatch(context)),
    Option.toArray
  )

const check = onNode([ts.SyntaxKind.IfStatement], ts.isIfStatement, manualTypeDispatchMatches)

export const noManualTypeDispatch = new Rule({
  id: ruleId,
  description:
    "Disallow dispatching on a value with a chain of returning if statements in favor of Effect Match.",
  check
})
