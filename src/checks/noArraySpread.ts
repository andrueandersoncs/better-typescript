import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext, Detection } from "../engine/check.js"

const spreadElementKind = ts.SyntaxKind.SpreadElement

const arraySpreadElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.SpreadElement): ReadonlyArray<Detection> =>
    ts.isArrayLiteralExpression(node.parent)
      ? [
          element({
            node,
            message:
              "Avoid the array-spread operator when constructing arrays.",
            hint:
              "Use Effect's Array module instead: Array.append or Array.prepend to add a " +
              "single element, Array.appendAll or Array.prependAll to combine two arrays, " +
              "and Array.fromIterable to materialize an iterable."
          })
        ]
      : []

  return matches
}

export const noArraySpread: Check = nodeCheck([spreadElementKind])(
  ts.isSpreadElement
)(arraySpreadElements)
