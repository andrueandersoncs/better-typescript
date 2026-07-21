import { Array, Function, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch } from "../matcher/data.js"

// NoForInLoopsFact is empty payload because guidance and matchers share identity.
export const NoForInLoopsFact = Schema.Struct({})

export interface NoForInLoopsFact extends Schema.Schema.Type<typeof NoForInLoopsFact> {}

// emptyNoForInLoopsFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoForInLoopsFact = NoForInLoopsFact.make({})

const forInStatementKinds = Array.of(ts.SyntaxKind.ForInStatement)

const matchForInLoopNode = (node: ts.ForInStatement) =>
  pipe(makeNodeMatch(node, emptyNoForInLoopsFact), Array.of)

const noForInLoopsMatches = Function.constant(matchForInLoopNode)

export const noForInLoopsMatcher = nodeMatcher(forInStatementKinds)(ts.isForInStatement)(
  noForInLoopsMatches
)
