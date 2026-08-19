import { Array, Function, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"

// NoNonNullAssertionFact exists because its fields form one stable data contract used by the linter.
export const NoNonNullAssertionFact = Schema.Struct({})

export interface NoNonNullAssertionFact extends Schema.Schema.Type<typeof NoNonNullAssertionFact> {}

// emptyNoNonNullAssertionFact exists because its fields form one stable data contract used by the linter.
export const emptyNoNonNullAssertionFact = NoNonNullAssertionFact.make({})

const nonNullExpressionKinds = Array.of(ts.SyntaxKind.NonNullExpression)

const matchNonNullAssertionNode = (node: ts.NonNullExpression) =>
  pipe(makeNodeMatch(node, emptyNoNonNullAssertionFact), Array.of)

const noNonNullAssertionMatches = Function.constant(matchNonNullAssertionNode)

export const noNonNullAssertionScanner = makeNodeScanner(nonNullExpressionKinds)(
  ts.isNonNullExpression
)(noNonNullAssertionMatches)
