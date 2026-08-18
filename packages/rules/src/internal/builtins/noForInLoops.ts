import { Array, Function, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeScanner } from "../scanner/nodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"

// NoForInLoopsFact exists because its fields form one stable data contract used by the linter.
export const NoForInLoopsFact = Schema.Struct({})

export interface NoForInLoopsFact extends Schema.Schema.Type<typeof NoForInLoopsFact> {}

// emptyNoForInLoopsFact exists because its fields form one stable data contract used by the linter.
export const emptyNoForInLoopsFact = NoForInLoopsFact.make({})

const forInStatementKinds = Array.of(ts.SyntaxKind.ForInStatement)

const matchForInLoopNode = (node: ts.ForInStatement) =>
  pipe(makeNodeMatch(node, emptyNoForInLoopsFact), Array.of)

const noForInLoopsMatches = Function.constant(matchForInLoopNode)

export const noForInLoopsScanner = nodeScanner(forInStatementKinds)(ts.isForInStatement)(
  noForInLoopsMatches
)
