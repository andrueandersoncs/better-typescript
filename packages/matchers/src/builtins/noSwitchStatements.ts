import { Array, Function, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch } from "../matcher/data.js"

// NoSwitchStatementsFact is empty payload because guidance and matchers share identity.
export const NoSwitchStatementsFact = Schema.Struct({})

export interface NoSwitchStatementsFact extends Schema.Schema.Type<typeof NoSwitchStatementsFact> {}

// emptyNoSwitchStatementsFact is empty payload because guidance and matchers share identity.
export const emptyNoSwitchStatementsFact = NoSwitchStatementsFact.make({})

const switchStatementKinds = Array.of(ts.SyntaxKind.SwitchStatement)

const matchSwitchStatementNode = (node: ts.SwitchStatement) =>
  pipe(makeNodeMatch(node, emptyNoSwitchStatementsFact), Array.of)

const noSwitchStatementsMatches = Function.constant(matchSwitchStatementNode)

export const noSwitchStatementsMatcher = nodeMatcher(switchStatementKinds)(ts.isSwitchStatement)(
  noSwitchStatementsMatches
)
