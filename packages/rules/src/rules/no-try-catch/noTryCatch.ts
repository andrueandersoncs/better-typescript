import { Array, Function, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"

// NoTryCatchFact exists because its fields form one stable data contract used by the linter.
export const NoTryCatchFact = Schema.Struct({})

export interface NoTryCatchFact extends Schema.Schema.Type<typeof NoTryCatchFact> {}

// emptyNoTryCatchFact exists because its fields form one stable data contract used by the linter.
export const emptyNoTryCatchFact = NoTryCatchFact.make({})

const tryStatementKinds = Array.of(ts.SyntaxKind.TryStatement)

const matchTryCatchNode = (node: ts.TryStatement) =>
  pipe(makeNodeMatch(node, emptyNoTryCatchFact), Array.of)

const noTryCatchMatches = Function.constant(matchTryCatchNode)

export const noTryCatchScanner = makeNodeScanner(tryStatementKinds)(ts.isTryStatement)(
  noTryCatchMatches
)
