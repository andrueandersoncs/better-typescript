import { Array, Function, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"

// NoTryCatchFact is empty payload because guidance and matchers share identity.
export const NoTryCatchFact = Schema.Struct({})

export interface NoTryCatchFact extends Schema.Schema.Type<typeof NoTryCatchFact> {}

// emptyNoTryCatchFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoTryCatchFact = NoTryCatchFact.make({})

const tryStatementKinds = Array.of(ts.SyntaxKind.TryStatement)

const matchTryCatchNode = (node: ts.TryStatement) =>
  pipe(nodeMatch(node, emptyNoTryCatchFact), Array.of)

const noTryCatchMatches = Function.constant(matchTryCatchNode)

export const noTryCatchMatcher = nodeMatcher(tryStatementKinds)(ts.isTryStatement)(
  noTryCatchMatches
)
