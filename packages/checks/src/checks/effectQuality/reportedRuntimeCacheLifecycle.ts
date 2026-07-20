import { Array, Function, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { enclosingFunctionLike, propertyAssignmentNamed } from "../functionalCoreEffect/support.js"
import { callExpressionOf, unwrapTransparentExpression } from "../support/tsNode.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import type { EffectQualityIndex } from "./index.js"
import { emptyRuleFindings, makeRuleFinding } from "./makeFindings.js"
import {
  callArgumentAt,
  effectApiCall,
  hasAncestor,
  isFunctionLikeExpression,
  layerAcquisitionNames,
  objectLiteralArgument
} from "./reportedRuntimeSupport.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const cacheMakeNames = Array.make("make", "makeWith")

const provideNames = Array.make(
  "provide",
  "provideService",
  "provideServiceEffect",
  "provideContext"
)

const layerBuildNames = Array.of("build")

const lookupNames = Array.of("lookup")

const cachePerRequestFinding = makeRuleFinding("cache-per-request")

const scopedClientCacheFinding = makeRuleFinding("scoped-client-cache")

const isModuleScopeFunction = (fn: ts.FunctionLikeDeclaration) => {
  const parent = fn.parent

  return pipe(
    Match.value(parent),
    Match.when(ts.isSourceFile, Function.constTrue),
    Match.when(ts.isModuleBlock, Function.constTrue),
    Match.when(ts.isVariableDeclaration, (declaration) => {
      const statement = declaration.parent?.parent
      const isVariableStatement = ts.isVariableStatement(statement)
      const parentOfStatement = statement.parent
      const isSourceFileParent = ts.isSourceFile(parentOfStatement)

      return isVariableStatement && isSourceFileParent
    }),
    Match.orElse(Function.constFalse)
  )
}

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

const cacheMakeLookupFunction =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ts.Expression> => {
    const matchesCacheMake = effectApiCall(checker)("Cache")(cacheMakeNames)

    if (!matchesCacheMake(call)) {
      return Option.none()
    }

    const options = pipe(
      Match.value(call.arguments.length),
      Match.when(1, () => callArgumentAt(0)(call)),
      Match.when(2, () => callArgumentAt(0)(call)),
      Match.orElse(() => Option.none())
    )

    return pipe(options, Option.flatMap(lookupExpressionFromCacheOptions))
  }

const ancestorIsLookupExpression = (lookup: ts.Expression) => (ancestor: ts.Node) =>
  strictEqual(ancestor, lookup)

const nestedInsideCacheLookup = (checker: ts.TypeChecker) => (node: ts.Node) => {
  const visit = (current: ts.Node): boolean => {
    if (!ts.isCallExpression(current)) {
      return pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
    }

    const lookupFunction = cacheMakeLookupFunction(checker)(current)

    if (Option.isSome(lookupFunction)) {
      const lookup = lookupFunction.value
      const isInsideLookup = hasAncestor(ancestorIsLookupExpression(lookup))

      return isInsideLookup(node)
    }

    return pipe(Option.fromNullishOr(current.parent), Option.exists(visit))
  }

  return pipe(Option.fromNullishOr(node.parent), Option.exists(visit))
}

const cacheMakeIsPerRequest = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    enclosingFunctionLike(call),
    Option.exists((fn) => {
      const hasParameters = fn.parameters.length > 0
      const moduleScope = isModuleScopeFunction(fn)
      const nested = strictEqual(moduleScope, false)
      const insideLookup = nestedInsideCacheLookup(checker)(call)
      const notLookup = strictEqual(insideLookup, false)
      const hasParametersOrNested = hasParameters || nested

      return hasParametersOrNested && notLookup
    })
  )

export const cachePerRequestFindings = (
  context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const matchesCacheMake = effectApiCall(context.checker)("Cache")(cacheMakeNames)

  return pipe(
    callExpressionOf(node),
    Option.filter(matchesCacheMake),
    Option.filter(cacheMakeIsPerRequest(context.checker)),
    Option.map(cachePerRequestFinding("Cache.make")),
    Option.toArray
  )
}

export const scopedClientCacheFindings = (
  context: CheckContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const matchesCall = effectApiCall(context.checker)
  const call = callExpressionOf(node)
  const isProvide = pipe(call, Option.exists(matchesCall("Effect")(provideNames)))
  const isLayerBuild = pipe(call, Option.exists(matchesCall("Layer")(layerBuildNames)))
  const isLayerAcquisition = pipe(call, Option.exists(matchesCall("Layer")(layerAcquisitionNames)))
  const provideOrBuild = isProvide || isLayerBuild
  const matches = provideOrBuild || isLayerAcquisition
  const nestedInLookup = nestedInsideCacheLookup(context.checker)(node)
  const matchedNestedFlags = Array.make(matches, nestedInLookup)
  const matchedNested = Array.every(matchedNestedFlags, Boolean)
  const shouldSkip = strictEqual(matchedNested, false)

  if (shouldSkip) {
    return emptyRuleFindings
  }

  const subject = node.getText(context.sourceFile)
  const finding = scopedClientCacheFinding(subject)(node)

  return Array.of(finding)
}
