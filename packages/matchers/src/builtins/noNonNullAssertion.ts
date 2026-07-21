import { Array, Function, pipe, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch } from "../matcher/data.js"

// NoNonNullAssertionFact is empty payload because guidance and matchers share identity.
export const NoNonNullAssertionFact = Schema.Struct({})

export interface NoNonNullAssertionFact extends Schema.Schema.Type<typeof NoNonNullAssertionFact> {}

// emptyNoNonNullAssertionFact is empty payload because guidance and matchers share identity.
export const emptyNoNonNullAssertionFact = NoNonNullAssertionFact.make({})

const nonNullExpressionKinds = Array.of(ts.SyntaxKind.NonNullExpression)

const matchNonNullAssertionNode = (node: ts.NonNullExpression) =>
  pipe(makeNodeMatch(node, emptyNoNonNullAssertionFact), Array.of)

const noNonNullAssertionMatches = Function.constant(matchNonNullAssertionNode)

export const noNonNullAssertionMatcher = nodeMatcher(nonNullExpressionKinds)(
  ts.isNonNullExpression
)(noNonNullAssertionMatches)
