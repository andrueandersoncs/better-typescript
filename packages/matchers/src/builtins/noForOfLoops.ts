import { Array, Function, Option, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"

// NoForOfLoopsFact records await style because remediation differs for async iterables.
export const NoForOfLoopsFact = Schema.Struct({
  isAsync: Schema.Boolean
})

export interface NoForOfLoopsFact extends Schema.Schema.Type<typeof NoForOfLoopsFact> {}

const matchForOfLoopNode = (node: ts.ForOfStatement) => {
  const awaitModifier = Option.fromNullishOr(node.awaitModifier)
  const isAsync = Option.isSome(awaitModifier)
  const fact = NoForOfLoopsFact.make({ isAsync })
  const match = nodeMatch(node, fact)

  return Array.of(match)
}

const noForOfLoopsMatches = Function.constant(matchForOfLoopNode)

const forOfStatementKinds = Array.of(ts.SyntaxKind.ForOfStatement)

export const noForOfLoopsMatcher = nodeMatcher(forOfStatementKinds)(ts.isForOfStatement)(
  noForOfLoopsMatches
)
