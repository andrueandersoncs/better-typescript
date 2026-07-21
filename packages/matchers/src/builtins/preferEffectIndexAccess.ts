import { Array, Schema } from "effect"
import * as ts from "typescript"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type MatchContext } from "../matcher/data.js"
import { isArrayLikeType } from "../support/tsType.js"

// PreferEffectIndexAccessFact is empty payload because guidance and matchers share identity.
export const PreferEffectIndexAccessFact = Schema.Struct({})

export interface PreferEffectIndexAccessFact extends Schema.Schema.Type<
  typeof PreferEffectIndexAccessFact
> {}

// emptyPreferEffectIndexAccessFact is empty payload because guidance and matchers share identity.
export const emptyPreferEffectIndexAccessFact = PreferEffectIndexAccessFact.make({})

const directIndexAccessMatches = (context: MatchContext) => {
  const matchesArrayLikeType = isArrayLikeType(context.checker)

  const matches = (node: ts.ElementAccessExpression) => {
    const receiverType = context.checker.getTypeAtLocation(node.expression)

    if (!matchesArrayLikeType(receiverType)) {
      return Array.empty()
    }

    const match = nodeMatch(node, emptyPreferEffectIndexAccessFact)

    return Array.of(match)
  }

  return matches
}

const elementAccessExpressionKinds = Array.of(ts.SyntaxKind.ElementAccessExpression)

export const preferEffectIndexAccessMatcher = nodeMatcher(elementAccessExpressionKinds)(
  ts.isElementAccessExpression
)(directIndexAccessMatches)
