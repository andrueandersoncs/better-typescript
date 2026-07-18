import { Array, Function, Match, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { foldAst } from "@better-typescript/core/engine/sources"
import { importedEffectApiAt, propertyAssignmentNamed } from "../functionalCoreEffect/support.js"
import {
  bindingNameText,
  callExpressionOf,
  isFunctionInitializer,
  unwrapTransparentExpression
} from "../support/tsNode.js"
import { emptyRuleFindings, makeRuleFinding } from "./makeFindings.js"

const tryPromiseNames = Array.of("tryPromise")

const tryPropertyNames = Array.of("try")

const signalPropertyNames = Array.of("signal")

const globalFetchReceivers = Array.make("globalThis", "window", "self")

const rawFetchFinding = makeRuleFinding("raw-fetch-abort-signal")

const expressionIsFetchCallee = (expression: ts.Expression) => {
  const current = unwrapTransparentExpression(expression)

  if (ts.isIdentifier(current)) {
    return current.text === "fetch"
  }

  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(current)

  return pipe(
    propertyAccess,
    Option.filter((access) => access.name.text === "fetch"),
    Option.map((access) => unwrapTransparentExpression(access.expression)),
    Option.filter(ts.isIdentifier),
    Option.exists((receiver) => Array.contains(globalFetchReceivers, receiver.text))
  )
}

const callIsFetch = (call: ts.CallExpression) => expressionIsFetchCallee(call.expression)

const tryPromiseBody = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const isTryPromise = importedEffectApiAt(checker, call.expression, "Effect", tryPromiseNames)

  if (!isTryPromise) {
    return Option.none()
  }

  return pipe(
    Array.head(call.arguments),
    Option.map(unwrapTransparentExpression),
    Option.flatMap((current) => {
      const asFunction = Option.liftPredicate(isFunctionInitializer)(current)

      const fromObject = pipe(
        Option.liftPredicate(ts.isObjectLiteralExpression)(current),
        Option.flatMap((object) => propertyAssignmentNamed(object, tryPropertyNames)),
        Option.map(Struct.get("initializer")),
        Option.map(unwrapTransparentExpression),
        Option.filter(isFunctionInitializer)
      )

      return pipe(asFunction, Option.orElse(Function.constant(fromObject)))
    })
  )
}

const signalParameterName = (callback: ts.ArrowFunction | ts.FunctionExpression) =>
  pipe(
    Array.head(callback.parameters),
    Option.map(Struct.get("name")),
    Option.flatMap(bindingNameText)
  )

const expressionReferencesName =
  (name: string) =>
  (expression: ts.Expression): boolean => {
    const current = unwrapTransparentExpression(expression)
    const recur = expressionReferencesName(name)

    return pipe(
      Match.value(current),
      Match.when(ts.isIdentifier, (identifier) => identifier.text === name),
      Match.when(ts.isPropertyAccessExpression, (access) => recur(access.expression)),
      Match.when(ts.isElementAccessExpression, (access) => recur(access.expression)),
      Match.when(ts.isAsExpression, (asExpression) => recur(asExpression.expression)),
      Match.when(ts.isSatisfiesExpression, (satisfiesExpression) =>
        recur(satisfiesExpression.expression)
      ),
      Match.when(ts.isParenthesizedExpression, (parenthesized) => recur(parenthesized.expression)),
      Match.when(ts.isNonNullExpression, (nonNull) => recur(nonNull.expression)),
      Match.when(ts.isConditionalExpression, (conditional) => {
        const whenTrue = recur(conditional.whenTrue)
        const whenFalse = recur(conditional.whenFalse)
        const flags = Array.make(whenTrue, whenFalse)

        return Array.some(flags, Boolean)
      }),
      Match.when(ts.isBinaryExpression, (binary) => {
        const left = recur(binary.left)
        const right = recur(binary.right)
        const flags = Array.make(left, right)

        return Array.some(flags, Boolean)
      }),
      Match.when(ts.isCallExpression, (call) => Array.some(call.arguments, recur)),
      Match.orElse(Function.constFalse)
    )
  }

const shorthandPropertyPassesSignal =
  (signalName: string) => (property: ts.ObjectLiteralElementLike) =>
    pipe(
      Option.liftPredicate(ts.isShorthandPropertyAssignment)(property),
      Option.exists((shorthand) => {
        const namedSignal = shorthand.name.text === "signal"
        const signalParamIsSignal = signalName === "signal"
        const flags = Array.make(namedSignal, signalParamIsSignal)

        return Array.every(flags, Boolean)
      })
    )

const spreadPassesSignal =
  (signalName: string) =>
  (property: ts.ObjectLiteralElementLike): boolean =>
    pipe(
      Option.liftPredicate(ts.isSpreadAssignment)(property),
      Option.exists((spreadAssignment) => {
        const spread = unwrapTransparentExpression(spreadAssignment.expression)
        const nestedObject = Option.liftPredicate(ts.isObjectLiteralExpression)(spread)

        return pipe(
          nestedObject,
          Option.map(objectPassesSignal(signalName)),
          Option.getOrElse(() => expressionReferencesName(signalName)(spreadAssignment.expression))
        )
      })
    )

const objectPassesSignal =
  (signalName: string) =>
  (object: ts.ObjectLiteralExpression): boolean => {
    const direct = pipe(
      propertyAssignmentNamed(object, signalPropertyNames),
      Option.exists((assignment) => expressionReferencesName(signalName)(assignment.initializer))
    )

    const shorthand = Array.some(object.properties, shorthandPropertyPassesSignal(signalName))
    const spread = Array.some(object.properties, spreadPassesSignal(signalName))
    const flags = Array.make(direct, shorthand, spread)

    return Array.some(flags, Boolean)
  }

const initPassesSignal = (signalName: string) => (init: ts.Expression) =>
  pipe(
    Option.liftPredicate(ts.isObjectLiteralExpression)(init),
    Option.map(objectPassesSignal(signalName)),
    Option.getOrElse(() => expressionReferencesName(signalName)(init))
  )

const fetchInitPassesSignal = (signalName: string) => (call: ts.CallExpression) =>
  pipe(
    Option.fromNullishOr(call.arguments[1]),
    Option.map(unwrapTransparentExpression),
    Option.exists(initPassesSignal(signalName))
  )

const fetchPassesSignal = (signalName: string) => (found: boolean, current: ts.Node) => {
  const asCall = callExpressionOf(current)

  const passes = pipe(
    asCall,
    Option.filter(callIsFetch),
    Option.exists(fetchInitPassesSignal(signalName))
  )

  return found || passes
}

const containsFetch = (found: boolean, current: ts.Node) => {
  const asCall = callExpressionOf(current)
  const isFetch = Option.exists(asCall, callIsFetch)

  return found || isFetch
}

const callbackContainsFetch = Function.flip(foldAst(containsFetch))(false)

const callbackPassesSignalToFetch = (signalName: string) => {
  const scan = Function.flip(foldAst(fetchPassesSignal(signalName)))(false)

  return scan
}

const signalMissingOnFetch =
  (callback: ts.ArrowFunction | ts.FunctionExpression) => (signalName: string) => {
    const passes = callbackPassesSignalToFetch(signalName)(callback)

    return !passes
  }

const findingsForMissingSignal =
  (call: ts.CallExpression) => (callback: ts.ArrowFunction | ts.FunctionExpression) => {
    const subject = pipe(
      signalParameterName(callback),
      Option.getOrElse(Function.constant("fetch"))
    )

    const finding = rawFetchFinding(subject)(call)

    return Array.of(finding)
  }

export const rawFetchAbortFindings = (context: CheckContext) => (node: ts.Node) =>
  pipe(
    callExpressionOf(node),
    Option.flatMap((call) =>
      pipe(
        tryPromiseBody(context.checker)(call),
        Option.filter(callbackContainsFetch),
        Option.filter((callback) =>
          pipe(
            signalParameterName(callback),
            Option.match({
              onNone: Function.constTrue,
              onSome: signalMissingOnFetch(callback)
            })
          )
        ),
        Option.map(findingsForMissingSignal(call))
      )
    ),
    Option.getOrElse(Function.constant(emptyRuleFindings))
  )
