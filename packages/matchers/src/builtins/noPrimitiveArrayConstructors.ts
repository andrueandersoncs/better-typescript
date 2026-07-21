import { Array, Function, Option, pipe, Struct, flow, Schema } from "effect"
import * as ts from "typescript"
import { isCallLikeExpression } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"
import { makeMatcherFromSubscriptions, nodeSubscriptions } from "../matcher/matcher.js"
import { nodeMatch } from "../matcher/data.js"

// NoPrimitiveArrayConstructorsFact is empty payload because guidance and matchers share identity.
export const NoPrimitiveArrayConstructorsFact = Schema.Struct({})

export interface NoPrimitiveArrayConstructorsFact extends Schema.Schema.Type<
  typeof NoPrimitiveArrayConstructorsFact
> {}

// emptyNoPrimitiveArrayConstructorsFact is shared empty fact because matchers share identity.
export const emptyNoPrimitiveArrayConstructorsFact = NoPrimitiveArrayConstructorsFact.make({})

const isArrayIdentifier = flow(Struct.get<ts.Identifier, "text">("text"), strictEqual("Array"))

const matchArrayLiteral = (node: ts.ArrayLiteralExpression) =>
  nodeMatch(node, emptyNoPrimitiveArrayConstructorsFact)

const arrayLiteralMatches = () => flow(matchArrayLiteral, Array.of)

const arrayConstructorMatches = () => (node: ts.CallExpression | ts.NewExpression) => {
  const isBareArray = pipe(
    Option.liftPredicate(ts.isIdentifier)(node.expression),
    Option.exists(isArrayIdentifier)
  )

  if (!isBareArray) {
    return Array.empty()
  }

  const match = nodeMatch(node, emptyNoPrimitiveArrayConstructorsFact)

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
