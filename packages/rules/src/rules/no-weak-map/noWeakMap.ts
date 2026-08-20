import { Array, Option, pipe, Predicate, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { isFirstPartySymbol } from "../../internal/support/isFirstPartySymbol.js"
import { strictEqual } from "../../internal/equivalence.js"

// NoWeakMapFact exists because its fields form one stable data contract used by the linter.
export const NoWeakMapFact = Schema.Struct({})

export interface NoWeakMapFact extends Schema.Schema.Type<typeof NoWeakMapFact> {}

// emptyNoWeakMapFact exists because its fields form one stable data contract used by the linter.
export const emptyNoWeakMapFact = NoWeakMapFact.make({})

const isWeakMapText = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("WeakMap"))

const weakMapIdentifier = (node: ts.Node): node is ts.Identifier =>
  pipe(Option.liftPredicate(ts.isIdentifier)(node), Option.exists(isWeakMapText))

const identifierKinds = Array.of(ts.SyntaxKind.Identifier)

const weakMapMatches = (context: MatchContext) => {
  const matchWeakMapIdentifier = (identifier: ts.Identifier) => {
    const match = makeNodeMatch(identifier, emptyNoWeakMapFact)

    return pipe(
      context.checker.getSymbolAtLocation(identifier),
      Option.fromNullishOr,
      Option.filter(Predicate.not(isFirstPartySymbol)),
      Option.as(match),
      Option.toArray
    )
  }

  return matchWeakMapIdentifier
}

export const noWeakMapScanner = makeNodeScanner(identifierKinds)(weakMapIdentifier)(weakMapMatches)
