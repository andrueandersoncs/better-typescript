import { Array, Schema } from "effect"
import * as ts from "typescript"
import { nodeScanner } from "../scanner/nodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { isArrayLikeType } from "../support/isArrayLikeType.js"

// PreferEffectIndexAccessFact exists because its fields form one stable data contract used by the linter.
export const PreferEffectIndexAccessFact = Schema.Struct({})

export interface PreferEffectIndexAccessFact extends Schema.Schema.Type<
  typeof PreferEffectIndexAccessFact
> {}

// emptyPreferEffectIndexAccessFact exists because its fields form one stable data contract used by the linter.
export const emptyPreferEffectIndexAccessFact = PreferEffectIndexAccessFact.make({})

const directIndexAccessMatches = (context: MatchContext) => {
  const matchesArrayLikeType = isArrayLikeType(context.checker)

  const matches = (node: ts.ElementAccessExpression) => {
    const receiverType = context.checker.getTypeAtLocation(node.expression)

    if (!matchesArrayLikeType(receiverType)) {
      return Array.empty()
    }

    const match = makeNodeMatch(node, emptyPreferEffectIndexAccessFact)

    return Array.of(match)
  }

  return matches
}

const elementAccessExpressionKinds = Array.of(ts.SyntaxKind.ElementAccessExpression)

export const preferEffectIndexAccessScanner = nodeScanner(elementAccessExpressionKinds)(
  ts.isElementAccessExpression
)(directIndexAccessMatches)
