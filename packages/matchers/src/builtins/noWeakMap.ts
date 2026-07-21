import { Array, Option, pipe, Predicate, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"
import { isFirstPartySymbol } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

// NoWeakMapFact is empty payload because guidance and matchers share identity.
export const NoWeakMapFact = Schema.Struct({})

export interface NoWeakMapFact extends Schema.Schema.Type<typeof NoWeakMapFact> {}

// emptyNoWeakMapFact is the shared empty fact because guidance and matchers share identity.
export const emptyNoWeakMapFact = NoWeakMapFact.make({})

const isWeakMapText = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("WeakMap"))

const weakMapIdentifier = (node: ts.Node): node is ts.Identifier =>
  pipe(Option.liftPredicate(ts.isIdentifier)(node), Option.exists(isWeakMapText))

const identifierKinds = Array.of(ts.SyntaxKind.Identifier)

const weakMapMatches = (context: MatchContext) => {
  const checker = context.checker

  const matchWeakMapIdentifier = (identifier: ts.Identifier) => {
    const match = nodeMatch(identifier, emptyNoWeakMapFact)

    return pipe(
      checker.getSymbolAtLocation(identifier),
      Option.fromNullishOr,
      Option.filter(Predicate.not(isFirstPartySymbol)),
      Option.as(match),
      Option.toArray
    )
  }

  return matchWeakMapIdentifier
}

export const noWeakMapMatcher = nodeMatcher(identifierKinds)(weakMapIdentifier)(weakMapMatches)
