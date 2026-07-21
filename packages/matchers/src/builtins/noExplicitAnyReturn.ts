import { Array, Function, Schema } from "effect"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"
import {
  hasAnyReturnType,
  isReturnTypeDeclaration,
  returnTypeDeclarationKinds,
  type ReturnTypeDeclaration
} from "../support/tsNode.js"

// NoExplicitAnyReturnFact is empty payload because guidance and matchers share identity.
export const NoExplicitAnyReturnFact = Schema.Struct({})

export interface NoExplicitAnyReturnFact extends Schema.Schema.Type<
  typeof NoExplicitAnyReturnFact
> {}

// emptyNoExplicitAnyReturnFact is empty payload because guidance and matchers share identity.
export const emptyNoExplicitAnyReturnFact = NoExplicitAnyReturnFact.make({})

const matchExplicitAnyReturnNode = (node: ReturnTypeDeclaration) => {
  if (!hasAnyReturnType(node)) {
    return Array.empty()
  }

  const match = nodeMatch(node, emptyNoExplicitAnyReturnFact)

  return Array.of(match)
}

const noExplicitAnyReturnMatches = Function.constant(matchExplicitAnyReturnNode)

export const noExplicitAnyReturnMatcher = nodeMatcher(returnTypeDeclarationKinds)(
  isReturnTypeDeclaration
)(noExplicitAnyReturnMatches)
