import { Array, Function, HashSet, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"

// PreferEquivalenceStrictEqualFact is empty payload because guidance and matchers share identity.
export const PreferEquivalenceStrictEqualFact = Schema.Struct({})

export interface PreferEquivalenceStrictEqualFact extends Schema.Schema.Type<
  typeof PreferEquivalenceStrictEqualFact
> {}

// emptyPreferEquivalenceStrictEqualFact is empty because guidance and matchers share identity.
export const emptyPreferEquivalenceStrictEqualFact = PreferEquivalenceStrictEqualFact.make({})

const strictEqualityOperators = HashSet.make(ts.SyntaxKind.EqualsEqualsEqualsToken)

const hasStrictEqualityOperator = (expression: ts.BinaryExpression) =>
  HashSet.has(strictEqualityOperators, expression.operatorToken.kind)

const isStrictEqualityExpression = (node: ts.Node): node is ts.BinaryExpression =>
  pipe(Option.liftPredicate(ts.isBinaryExpression)(node), Option.exists(hasStrictEqualityOperator))

const matchStrictEqualityExpression = (expression: ts.BinaryExpression) =>
  pipe(nodeMatch(expression, emptyPreferEquivalenceStrictEqualFact), Array.of)

const strictEqualityMatches = Function.constant(matchStrictEqualityExpression)

const binaryExpressionKinds = Array.of(ts.SyntaxKind.BinaryExpression)

export const preferEquivalenceStrictEqualMatcher = nodeMatcher(binaryExpressionKinds)(
  isStrictEqualityExpression
)(strictEqualityMatches)
