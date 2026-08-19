import { Array, Function, Option, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { strictEqual } from "../equivalence.js"

// PreferImplicitReturnFact exists because its fields form one stable data contract used by the linter.
export const PreferImplicitReturnFact = Schema.Struct({})

export interface PreferImplicitReturnFact extends Schema.Schema.Type<
  typeof PreferImplicitReturnFact
> {}

// emptyPreferImplicitReturnFact exists because its fields form one stable data contract used by the linter.
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

export const preferImplicitReturnScanner = makeNodeScanner(arrowFunctionKinds)(ts.isArrowFunction)(
  matches
)
