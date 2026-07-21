import { Array, Option, Struct, flow, pipe, Schema } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"

// NoNewErrorFact is empty payload because guidance and matchers share identity.
export const NoNewErrorFact = Schema.Struct({})

export interface NoNewErrorFact extends Schema.Schema.Type<typeof NoNewErrorFact> {}

// emptyNoNewErrorFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoNewErrorFact = NoNewErrorFact.make({})

const isErrorIdentifier = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Error"))

const newExpressionKinds = Array.of(ts.SyntaxKind.NewExpression)

const noNewErrorMatches = () => (node: ts.NewExpression) => {
  const isBareError = pipe(
    Option.liftPredicate(ts.isIdentifier)(node.expression),
    Option.exists(isErrorIdentifier)
  )

  if (!isBareError) {
    return Array.empty()
  }

  const match = nodeMatch(node, emptyNoNewErrorFact)

  return Array.of(match)
}

export const noNewErrorMatcher = nodeMatcher(newExpressionKinds)(ts.isNewExpression)(
  noNewErrorMatches
)
