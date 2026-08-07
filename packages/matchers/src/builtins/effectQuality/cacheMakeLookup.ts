import { Array, Match as EffectMatch, Function, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

import { propertyAssignmentNamed } from "../functionalCoreEffect/propertyAssignments.js"

import { callArgumentAt } from "./callArgumentAt.js"

import { effectApiCall } from "./effectApiCall.js"

import { hasAncestor } from "./hasAncestor.js"

import { isFunctionLikeExpression } from "./isFunctionLikeExpression.js"

import { objectLiteralArgument } from "./objectLiteralArgument.js"

const cacheMakeNames = Array.make("make", "makeWith")

const lookupNames = Array.of("lookup")

const lookupPropertyAssignment = (object: ts.ObjectLiteralExpression) =>
  pipe(propertyAssignmentNamed(object, lookupNames), Option.filter(ts.isPropertyAssignment))

const unwrappedPropertyInitializer = (property: ts.PropertyAssignment) =>
  unwrapTransparentExpression(property.initializer)

const lookupExpressionFromCacheOptions = (argument: ts.Expression) => {
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
