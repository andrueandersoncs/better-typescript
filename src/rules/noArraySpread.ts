import * as ts from "typescript"
import { nodeCheck } from "./ruleCheck.js"
import { detection } from "../detectors/location.js"
import type { RuleCheck, RuleContext, Detection } from "../detectors/rule.js"

const spreadElementKind = ts.SyntaxKind.SpreadElement

const arraySpreadElements = (context: RuleContext) => {
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

export const noArraySpread: RuleCheck = nodeCheck([spreadElementKind])(
  ts.isSpreadElement
)(arraySpreadElements)
