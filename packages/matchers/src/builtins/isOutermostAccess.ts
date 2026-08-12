import { Array, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"
import { isAccessExpression } from "./effectQuality/isAccessExpression.js"

const isTransparentWrapper = (node: ts.Node) => {
  const parenthesized = ts.isParenthesizedExpression(node)
  const asserted = ts.isAsExpression(node)
  const satisfied = ts.isSatisfiesExpression(node)
  const candidates = Array.make(parenthesized, asserted, satisfied)

  return Array.some(candidates, Boolean)
}

const parentAfterWrappers = (node: ts.Node): ts.Node =>
  isTransparentWrapper(node.parent) ? parentAfterWrappers(node.parent) : node.parent

export const isOutermostAccess = (
  access: ts.PropertyAccessExpression | ts.ElementAccessExpression
) => {
  const parent = parentAfterWrappers(access)

  const parentReceiver = pipe(
    Option.liftPredicate(isAccessExpression)(parent),
    Option.map(
      Struct.get<ts.PropertyAccessExpression | ts.ElementAccessExpression, "expression">(
        "expression"
      )
    ),
    Option.map(unwrapTransparentExpression)
  )

  const accessIsReceiver = pipe(parentReceiver, Option.exists(strictEqual(access)))

  return !accessIsReceiver
}
