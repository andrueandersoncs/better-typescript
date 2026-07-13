import { Array } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
const spreadElementKind = ts.SyntaxKind.SpreadElement

const arraySpreadElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ts.SpreadElement): ReadonlyArray<Detection> => {
    const reported = element({
      node,
      message: "Avoid the array-spread operator when constructing arrays.",
      hint:
        "Use Effect's Array module instead: Array.append or Array.prepend to add a " +
        "single element, Array.appendAll or Array.prependAll to combine two arrays, " +
        "and Array.fromIterable to materialize an iterable."
    })

    return ts.isArrayLiteralExpression(node.parent)
      ? Array.of(reported)
      : Array.empty()
  }

  return matches
}

const spreadElementKinds = Array.of(spreadElementKind)

export const noArraySpread: Check = nodeCheck(spreadElementKinds)(ts.isSpreadElement)(
  arraySpreadElements
)

export const noArraySpreadExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-array-spread")
