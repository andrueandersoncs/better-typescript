import { Array, Function, Option, pipe, Struct, flow } from "effect"
import * as ts from "typescript"
import { isCallLikeExpression } from "../support/isCallLikeExpression.js"
import { strictEqual } from "../equivalence.js"
import { makeMatcherFromSubscriptions } from "../matcher/makeMatcherFromSubscriptions.js"
import { nodeSubscriptions } from "../matcher/nodeSubscriptions.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import { emptyNoPrimitiveArrayConstructorsFact } from "./noPrimitiveArrayConstructorsFact.js"

const isArrayIdentifier = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Array"))

const matchArrayLiteral = (node: ts.ArrayLiteralExpression) =>
  makeNodeMatch(node, emptyNoPrimitiveArrayConstructorsFact)

const arrayLiteralMatches = () => flow(matchArrayLiteral, Array.of)

const arrayConstructorMatches = () => (node: ts.CallExpression | ts.NewExpression) => {
  const isBareArray = pipe(
    Option.liftPredicate(ts.isIdentifier)(node.expression),
    Option.exists(isArrayIdentifier)
  )

  if (!isBareArray) {
    return Array.empty()
  }

  const match = makeNodeMatch(node, emptyNoPrimitiveArrayConstructorsFact)

  return Array.of(match)
}

const arrayLiteralKinds = Array.of(ts.SyntaxKind.ArrayLiteralExpression)

const arrayLiteralListeners = nodeSubscriptions(arrayLiteralKinds)(ts.isArrayLiteralExpression)(
  arrayLiteralMatches
)

const arrayConstructorKinds = Array.make(ts.SyntaxKind.NewExpression, ts.SyntaxKind.CallExpression)

const arrayConstructorListeners =
  nodeSubscriptions(arrayConstructorKinds)(isCallLikeExpression)(arrayConstructorMatches)

const arrayConstructorListenerGroups = Array.make(arrayLiteralListeners, arrayConstructorListeners)
const arrayConstructorSubscriptionList = Array.flatten(arrayConstructorListenerGroups)

export const noPrimitiveArrayConstructorsMatcher = makeMatcherFromSubscriptions(
  Function.constant(arrayConstructorSubscriptionList)
)
