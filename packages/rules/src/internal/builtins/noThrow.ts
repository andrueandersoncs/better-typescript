import { Array, Function, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeScanner } from "../scanner/nodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"

// NoThrowFact exists because its fields form one stable data contract used by the linter.
export const NoThrowFact = Schema.Struct({})

export interface NoThrowFact extends Schema.Schema.Type<typeof NoThrowFact> {}

// emptyNoThrowFact exists because its fields form one stable data contract used by the linter.
export const emptyNoThrowFact = NoThrowFact.make({})

const throwStatementKinds = Array.of(ts.SyntaxKind.ThrowStatement)

const matchThrowNode = (node: ts.ThrowStatement) =>
  pipe(makeNodeMatch(node, emptyNoThrowFact), Array.of)

const noThrowMatches = Function.constant(matchThrowNode)

export const noThrowScanner = nodeScanner(throwStatementKinds)(ts.isThrowStatement)(noThrowMatches)
