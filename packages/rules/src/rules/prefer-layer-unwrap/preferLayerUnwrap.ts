import { Array, Option, Tuple, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"
import { effectApiCall, isPipeCall } from "../../internal/builtins/effectQuality/effectApiFacts.js"
import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"
import { typeSymbol } from "../../internal/builtins/typeSymbol.js"
import type { Match as ScannerMatch } from "../../internal/scanner/match.js"
import type { MatchContext } from "../../internal/scanner/matchContext.js"
import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { symbolDeclaredInEffectPackage } from "../../internal/support/declarationInEffectPackage.js"
import { resolvedSymbolAt } from "../../internal/support/resolvedSymbolAt.js"
import { objectTypeReferenceArguments } from "../../internal/support/typeArgumentsOfReference.js"
import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

const layerEffectNames = Array.of("effect")
const layerFlatMapNames = Array.of("flatMap")
const contextGetNames = Array.of("get")

const callArgument = (index: number) => (call: ts.CallExpression) =>
  Option.fromNullishOr(call.arguments[index])

const layerEffectParts =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): Option.Option<readonly [ts.Expression, ts.Expression]> => {
    const call = pipe(
      expression,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isCallExpression)
    )

    if (Option.isNone(call)) {
      return Option.none()
    }

    const isLayerEffect = effectApiCall(checker)("Layer")(layerEffectNames)

    if (!isLayerEffect(call.value)) {
      return Option.none()
    }

    const directKey = callArgument(0)(call.value)
    const directEffect = callArgument(1)(call.value)
    const direct = Option.product(directKey, directEffect)

    if (Option.isSome(direct)) {
      return direct
    }

    const inner = pipe(
      call.value.expression,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isCallExpression),
      Option.filter(isLayerEffect)
    )

    if (Option.isNone(inner)) {
      return Option.none()
    }

    const key = callArgument(0)(inner.value)
    const effect = callArgument(0)(call.value)

    return Option.product(key, effect)
  }

const callContainsStage = (stage: ts.CallExpression) => (call: ts.CallExpression) =>
  Array.some(call.arguments, strictEqual(stage))

const propertyAccessNameIsPipe = (access: ts.PropertyAccessExpression) =>
  strictEqual("pipe")(access.name.text)

const parentPipeSelf =
  (checker: ts.TypeChecker) =>
  (stage: ts.CallExpression): Option.Option<ts.Expression> => {
    const parent = pipe(
      Option.fromNullishOr(stage.parent),
      Option.filter(ts.isCallExpression),
      Option.filter(callContainsStage(stage))
    )

    if (Option.isNone(parent)) {
      return Option.none()
    }

    const callee = unwrapTransparentExpression(parent.value.expression)

    const methodPipe = pipe(
      callee,
      Option.liftPredicate(ts.isPropertyAccessExpression),
      Option.filter(propertyAccessNameIsPipe)
    )

    if (Option.isSome(methodPipe)) {
      return Option.some(methodPipe.value.expression)
    }

    const functionPipe = isPipeCall(checker)(parent.value)

    return functionPipe ? callArgument(0)(parent.value) : Option.none()
  }

const flatMapParts =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<readonly [ts.Expression, ts.Expression]> => {
    const isLayerFlatMap = effectApiCall(checker)("Layer")(layerFlatMapNames)

    if (!isLayerFlatMap(call)) {
      return Option.none()
    }

    const directSource = callArgument(0)(call)
    const directMapper = callArgument(1)(call)
    const direct = Option.product(directSource, directMapper)

    if (Option.isSome(direct)) {
      return direct
    }

    const inner = pipe(
      call.expression,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isCallExpression),
      Option.filter(isLayerFlatMap)
    )

    if (Option.isSome(inner)) {
      const curriedSource = callArgument(0)(call)
      const curriedMapper = callArgument(0)(inner.value)

      return Option.product(curriedSource, curriedMapper)
    }

    const pipeSource = parentPipeSelf(checker)(call)
    const pipeMapper = callArgument(0)(call)

    return Option.product(pipeSource, pipeMapper)
  }

const contextGetKey =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): Option.Option<ts.Expression> =>
    pipe(
      expression,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isCallExpression),
      Option.filter(effectApiCall(checker)("Context")(contextGetNames)),
      Option.flatMap(callArgument(0))
    )

const symbolIsNamedEffectType = (name: string) => (symbol: ts.Symbol) => {
  const hasName = strictEqual(name)(symbol.name)
  const fromEffect = symbolDeclaredInEffectPackage(symbol)
  const checks = Array.make(hasName, fromEffect)

  return Array.every(checks, Boolean)
}

const typeIsNamedEffectType = (name: string) => (type: ts.Type) =>
  pipe(typeSymbol(type), Option.exists(symbolIsNamedEffectType(name)))

const typeIsLayer = (type: ts.Type): boolean =>
  type.isUnion() ? Array.every(type.types, typeIsLayer) : typeIsNamedEffectType("Layer")(type)

const effectProducesLayer = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const type = checker.getTypeAtLocation(expression)
  const isEffect = typeIsNamedEffectType("Effect")(type)
  const typeArguments = objectTypeReferenceArguments(checker)(type)
  const success = pipe(typeArguments, Array.head)
  const producesLayer = pipe(success, Option.exists(typeIsLayer))

  return isEffect && producesLayer
}

const symbolPairMatches = (symbols: readonly [ts.Symbol, ts.Symbol]) => {
  const left = Tuple.get(symbols, 0)
  const right = Tuple.get(symbols, 1)

  return strictEqual(right)(left)
}

const expressionsHaveSameSymbol =
  (checker: ts.TypeChecker) => (left: ts.Expression) => (right: ts.Expression) => {
    const leftSymbol = resolvedSymbolAt(checker)(left)
    const rightSymbol = resolvedSymbolAt(checker)(right)
    const symbols = Option.product(leftSymbol, rightSymbol)

    return pipe(symbols, Option.exists(symbolPairMatches))
  }

const partsProduceLayer =
  (checker: ts.TypeChecker) =>
  (parts: readonly [readonly [ts.Expression, ts.Expression], ts.Expression]) => {
    const layerEffect = Tuple.get(parts, 0)
    const effect = Tuple.get(layerEffect, 1)

    return effectProducesLayer(checker)(effect)
  }

const partsUseSameKey =
  (checker: ts.TypeChecker) =>
  (parts: readonly [readonly [ts.Expression, ts.Expression], ts.Expression]) => {
    const layerEffect = Tuple.get(parts, 0)
    const effectKey = Tuple.get(layerEffect, 0)
    const mapperKey = Tuple.get(parts, 1)

    return expressionsHaveSameSymbol(checker)(effectKey)(mapperKey)
  }

const preferLayerUnwrapFinding =
  (context: MatchContext) =>
  (call: ts.CallExpression): Option.Option<ScannerMatch<string>> => {
    const flatMap = flatMapParts(context.checker)(call)

    if (Option.isNone(flatMap)) {
      return Option.none()
    }

    const source = Tuple.get(flatMap.value, 0)
    const mapper = Tuple.get(flatMap.value, 1)
    const layerEffect = layerEffectParts(context.checker)(source)
    const mapperKey = contextGetKey(context.checker)(mapper)
    const parts = Option.product(layerEffect, mapperKey)

    return pipe(
      parts,
      Option.filter(partsProduceLayer(context.checker)),
      Option.filter(partsUseSameKey(context.checker)),
      Option.map(() => makeSubjectMatch("Layer.unwrap")(call))
    )
  }

const preferLayerUnwrapFindings =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> =>
    pipe(preferLayerUnwrapFinding(context)(node), Option.toArray)

export const preferLayerUnwrapScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  preferLayerUnwrapFindings
)
