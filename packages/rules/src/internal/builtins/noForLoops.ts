import { Array, Function, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { nodeScanner } from "../scanner/nodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"

// NoForLoopsFact exists because its fields form one stable data contract used by the linter.
export const NoForLoopsFact = Schema.Struct({})

export interface NoForLoopsFact extends Schema.Schema.Type<typeof NoForLoopsFact> {}

// emptyNoForLoopsFact exists because its fields form one stable data contract used by the linter.
export const emptyNoForLoopsFact = NoForLoopsFact.make({})

const matchForLoopNode = (node: ts.ForStatement) => {
  const hasStopCondition = pipe(Option.fromNullishOr(node.condition), Option.isSome)
  const hasInitializer = pipe(Option.fromNullishOr(node.initializer), Option.isSome)
  const hasIncrementor = pipe(Option.fromNullishOr(node.incrementor), Option.isSome)
  const iteratorParts = Array.make(hasInitializer, hasIncrementor)
  const hasIterator = Array.some(iteratorParts, Boolean)
  const iteratorForLoopConditions = Array.make(hasStopCondition, hasIterator)
  const isIteratorForLoop = Array.every(iteratorForLoopConditions, Boolean)

  if (!isIteratorForLoop) {
    return Array.empty()
  }

  const match = makeNodeMatch(node, emptyNoForLoopsFact)

  return Array.of(match)
}

const noForLoopsMatches = Function.constant(matchForLoopNode)

const forStatementKinds = Array.of(ts.SyntaxKind.ForStatement)

export const noForLoopsScanner = nodeScanner(forStatementKinds)(ts.isForStatement)(
  noForLoopsMatches
)
