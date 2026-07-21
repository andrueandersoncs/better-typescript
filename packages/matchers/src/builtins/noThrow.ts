import { Array, Function, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch } from "../matcher/data.js"

// NoThrowFact is empty payload because guidance and matchers share identity.
export const NoThrowFact = Schema.Struct({})

export interface NoThrowFact extends Schema.Schema.Type<typeof NoThrowFact> {}

// emptyNoThrowFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoThrowFact = NoThrowFact.make({})

const throwStatementKinds = Array.of(ts.SyntaxKind.ThrowStatement)

const matchThrowNode = (node: ts.ThrowStatement) =>
  pipe(makeNodeMatch(node, emptyNoThrowFact), Array.of)

const noThrowMatches = Function.constant(matchThrowNode)

export const noThrowMatcher = nodeMatcher(throwStatementKinds)(ts.isThrowStatement)(noThrowMatches)
