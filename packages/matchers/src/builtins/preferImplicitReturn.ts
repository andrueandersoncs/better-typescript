import { Array, Function, Option, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { MatchContext } from "../matcher/matchContext.js"
import { strictEqual } from "../equivalence.js"

// PreferImplicitReturnFact is empty payload because guidance and matchers share identity.
export const PreferImplicitReturnFact = Schema.Struct({})

export interface PreferImplicitReturnFact extends Schema.Schema.Type<
  typeof PreferImplicitReturnFact
> {}

// emptyPreferImplicitReturnFact is empty payload because guidance and matchers share identity.
export const emptyPreferImplicitReturnFact = PreferImplicitReturnFact.make({})

const arrowFunctionKinds = Array.of(ts.SyntaxKind.ArrowFunction)

const matches = (_context: MatchContext) => (arrowFunction: ts.ArrowFunction) => {
  if (!ts.isBlock(arrowFunction.body)) return Array.empty()
  const hasOneStatement = strictEqual(1)(arrowFunction.body.statements.length)
  const firstStatement = arrowFunction.body.statements[0]

  const returnExpression = Function.flow(
    Struct.get<ts.ReturnStatement, "expression">("expression"),
    Option.fromNullishOr
  )

  const hasSingleValueReturn =
    hasOneStatement &&
    pipe(
      Option.liftPredicate(ts.isReturnStatement)(firstStatement),
      Option.flatMap(returnExpression),
      Option.isSome
    )

  if (!hasSingleValueReturn) {
    return Array.empty()
  }

  const match = makeNodeMatch(arrowFunction.body, emptyPreferImplicitReturnFact)

  return Array.of(match)
}

export const preferImplicitReturnMatcher = nodeMatcher(arrowFunctionKinds)(ts.isArrowFunction)(
  matches
)
