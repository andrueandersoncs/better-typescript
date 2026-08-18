import { Array, Function, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeScanner } from "../scanner/nodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"

// NoSwitchStatementsFact exists because its fields form one stable data contract used by the linter.
export const NoSwitchStatementsFact = Schema.Struct({})

export interface NoSwitchStatementsFact extends Schema.Schema.Type<typeof NoSwitchStatementsFact> {}

// emptyNoSwitchStatementsFact exists because its fields form one stable data contract used by the linter.
export const emptyNoSwitchStatementsFact = NoSwitchStatementsFact.make({})

const switchStatementKinds = Array.of(ts.SyntaxKind.SwitchStatement)

const matchSwitchStatementNode = (node: ts.SwitchStatement) =>
  pipe(makeNodeMatch(node, emptyNoSwitchStatementsFact), Array.of)

const noSwitchStatementsMatches = Function.constant(matchSwitchStatementNode)

export const noSwitchStatementsScanner = nodeScanner(switchStatementKinds)(ts.isSwitchStatement)(
  noSwitchStatementsMatches
)
