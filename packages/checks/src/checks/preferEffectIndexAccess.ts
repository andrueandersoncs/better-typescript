import { Array } from "effect"
import * as ts from "typescript"
import { isArrayLikeType } from "./support/tsType.js"
import { makeCheck } from "../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeDetection } from "@better-typescript/core/engine/check"

const hint =
  "Use Array.get(collection, index) to represent a potentially absent array element, " +
  "or Array.headNonEmpty when a collection is proven non-empty. For a fixed-length tuple, " +
  "use Tuple.get(tuple, index) to preserve its positional type."

const directIndexAccessMatches = (context: CheckContext) => {
  const matchesArrayLikeType = isArrayLikeType(context.checker)
  const match = makeDetection(context)

  const matches = (node: ts.ElementAccessExpression): ReadonlyArray<Detection> => {
    const receiverType = context.checker.getTypeAtLocation(node.expression)

    if (!matchesArrayLikeType(receiverType)) {
      return Array.empty()
    }

    const detection = match({
      node,
      message: "Avoid direct array and tuple index access.",
      hint
    })

    return Array.of(detection)
  }

  return matches
}

const elementAccessExpressionKinds = Array.of(ts.SyntaxKind.ElementAccessExpression)

export const preferEffectIndexAccess = makeCheck(
  "prefer-effect-index-access",
  elementAccessExpressionKinds,
  ts.isElementAccessExpression,
  directIndexAccessMatches
)
