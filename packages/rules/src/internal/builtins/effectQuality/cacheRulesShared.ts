import { objectLiteralArgument } from "../../support/objectLiteralArgument.js"
import { Array, Match as EffectMatch, Function, Option, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../equivalence.js"

import { propertyAssignmentNamed } from "../../support/effectApi/propertyAssignments.js"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

import {
  callArgumentAt,
  effectApiCall,
  hasAncestor,
  isFunctionLikeExpression
} from "./effectApiFacts.js"

export const lookupNames = Array.of("lookup")

export const lookupPropertyAssignment = (object: ts.ObjectLiteralExpression) =>
  pipe(propertyAssignmentNamed(lookupNames)(object), Option.filter(ts.isPropertyAssignment))

export const unwrappedPropertyInitializer = (property: ts.PropertyAssignment) =>
  unwrapTransparentExpression(property.initializer)

export const lookupExpressionFromCacheOptions = (argument: ts.Expression) => {
  const unwrapped = unwrapTransparentExpression(argument)
  const asObject = objectLiteralArgument(argument)

  const fromObject = pipe(
    asObject,
    Option.flatMap(lookupPropertyAssignment),
    Option.map(unwrappedPropertyInitializer),
    Option.filter(isFunctionLikeExpression)
  )

  const asFunction = pipe(Option.some(unwrapped), Option.filter(isFunctionLikeExpression))

  return pipe(fromObject, Option.orElse(Function.constant(asFunction)))
}

export const cacheMakeLookupFunction =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ts.Expression> => {
    const matchesCacheMake = effectApiCall(checker)("Cache")(cacheMakeNames)

    if (!matchesCacheMake(call)) {
      return Option.none()
    }

    const options = pipe(
      EffectMatch.value(call.arguments.length),
      EffectMatch.when(1, () => callArgumentAt(0)(call)),
      EffectMatch.when(2, () => callArgumentAt(0)(call)),
      EffectMatch.orElse(() => Option.none())
    )

    return pipe(options, Option.flatMap(lookupExpressionFromCacheOptions))
  }

export const nestedInsideCacheLookup = (checker: ts.TypeChecker) => (node: ts.Node) => {
  const visit = (current: ts.Node): boolean => {
    if (!ts.isCallExpression(current)) {
      return pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
    }

    const lookupFunction = cacheMakeLookupFunction(checker)(current)

    if (Option.isSome(lookupFunction)) {
      const isInsideLookup = hasAncestor(strictEqual(lookupFunction.value))

      return isInsideLookup(node)
    }

    return pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
  }

  return pipe(Option.fromNullishOr(node.parent), Option.exists(visit))
}

export const identifierTextIsMap = flow(
  Struct.get<ts.Identifier, "text">("text"),
  strictEqual("Map")
)

export const isMapIdentifier = (expression: ts.Expression) =>
  pipe(Option.liftPredicate(ts.isIdentifier)(expression), Option.exists(identifierTextIsMap))

export const newExpressionIsMap = (expression: ts.NewExpression) =>
  isMapIdentifier(expression.expression)

export const newMapExpression = (node: ts.Node) =>
  pipe(Option.liftPredicate(ts.isNewExpression)(node), Option.filter(newExpressionIsMap))

export const cacheMakeNames = Array.make("make", "makeWith")
