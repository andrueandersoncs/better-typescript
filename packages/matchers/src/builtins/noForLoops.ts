import { Array, Function, Option, pipe, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"

// NoForLoopsFact is empty payload because guidance and matchers share identity.
export const NoForLoopsFact = Schema.Struct({})

export interface NoForLoopsFact extends Schema.Schema.Type<typeof NoForLoopsFact> {}

// emptyNoForLoopsFact is the shared empty fact because guidance and matchers share identity.
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

  const match = nodeMatch(node, emptyNoForLoopsFact)

  return Array.of(match)
}

const noForLoopsMatches = Function.constant(matchForLoopNode)

const forStatementKinds = Array.of(ts.SyntaxKind.ForStatement)

export const noForLoopsMatcher = nodeMatcher(forStatementKinds)(ts.isForStatement)(
  noForLoopsMatches
)
