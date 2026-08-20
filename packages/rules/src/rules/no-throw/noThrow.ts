import { Array, Function, Schema, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"

// NoThrowFact exists because its fields form one stable data contract used by the linter.
export const NoThrowFact = Schema.Struct({})

export interface NoThrowFact extends Schema.Schema.Type<typeof NoThrowFact> {}

// emptyNoThrowFact exists because its fields form one stable data contract used by the linter.
export const emptyNoThrowFact = NoThrowFact.make({})

const throwStatementKinds = Array.of(ts.SyntaxKind.ThrowStatement)

const matchThrowNode = (node: ts.ThrowStatement) =>
  pipe(makeNodeMatch(node, emptyNoThrowFact), Array.of)

const noThrowMatches = Function.constant(matchThrowNode)

export const noThrowScanner = makeNodeScanner(throwStatementKinds)(ts.isThrowStatement)(
  noThrowMatches
)
