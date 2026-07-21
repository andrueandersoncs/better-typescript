import { Array, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { makeNodeMatch } from "../matcher/data.js"

// NoArraySpreadFact is empty payload because guidance and matchers share identity.
export const NoArraySpreadFact = Schema.Struct({})

export interface NoArraySpreadFact extends Schema.Schema.Type<typeof NoArraySpreadFact> {}

// emptyNoArraySpreadFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoArraySpreadFact = NoArraySpreadFact.make({})

const spreadElementKinds = Array.of(ts.SyntaxKind.SpreadElement)

const noArraySpreadMatches = () => (node: ts.SpreadElement) => {
  if (!ts.isArrayLiteralExpression(node.parent)) {
    return Array.empty()
  }

  const match = makeNodeMatch(node, emptyNoArraySpreadFact)

  return Array.of(match)
}

export const noArraySpreadMatcher = nodeMatcher(spreadElementKinds)(ts.isSpreadElement)(
  noArraySpreadMatches
)
