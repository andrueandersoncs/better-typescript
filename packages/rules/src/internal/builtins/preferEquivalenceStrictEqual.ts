import { Array, Function, HashSet, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"

// PreferEquivalenceStrictEqualFact exists because its fields form one stable data contract used by the linter.
export const PreferEquivalenceStrictEqualFact = Schema.Struct({})

export interface PreferEquivalenceStrictEqualFact extends Schema.Schema.Type<
  typeof PreferEquivalenceStrictEqualFact
> {}

// emptyPreferEquivalenceStrictEqualFact exists because its fields form one stable data contract used by the linter.
export const emptyPreferEquivalenceStrictEqualFact = PreferEquivalenceStrictEqualFact.make({})

const strictEqualityOperators = HashSet.make(ts.SyntaxKind.EqualsEqualsEqualsToken)

const hasStrictEqualityOperator = (expression: ts.BinaryExpression) =>
  HashSet.has(strictEqualityOperators, expression.operatorToken.kind)

const isStrictEqualityExpression = (node: ts.Node): node is ts.BinaryExpression =>
  pipe(Option.liftPredicate(ts.isBinaryExpression)(node), Option.exists(hasStrictEqualityOperator))

const matchStrictEqualityExpression = (expression: ts.BinaryExpression) =>
  pipe(makeNodeMatch(expression, emptyPreferEquivalenceStrictEqualFact), Array.of)

const strictEqualityMatches = Function.constant(matchStrictEqualityExpression)

const binaryExpressionKinds = Array.of(ts.SyntaxKind.BinaryExpression)

export const preferEquivalenceStrictEqualScanner = makeNodeScanner(binaryExpressionKinds)(
  isStrictEqualityExpression
)(strictEqualityMatches)
