import { Array, Function, HashSet, Match, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"
import { unwrapCallee } from "../../support/unwrapCallee.js"

import { effectApiReference } from "./effectApiReference.js"

const scheduleForeverNames = Array.of("forever")

const scheduleBoundNames = Array.make(
  "recurs",
  "upTo",
  "times",
  "count",
  "while_",
  "until",
  "intersect"
)

const scheduleBaseNames = Array.make(
  "exponential",
  "fibonacci",
  "spaced",
  "fixed",
  "forever",
  "repeatForever",
  "fromDelay",
  "fromDelays"
)

const scheduleBoundMethodNames = HashSet.make(
  "compose",
  "intersect",
  "either",
  "andThen",
  "upTo",
  "while",
  "until",
  "times",
  "recurs"
)

export const scheduleExpressionIsBounded =
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression): boolean => {
    const unwrapped = unwrapTransparentExpression(expression)
    const scheduleReference = effectApiReference(checker)("Schedule")
    const isBoundName = scheduleReference(scheduleBoundNames)
    const isForeverName = scheduleReference(scheduleForeverNames)
    const isBaseName = scheduleReference(scheduleBaseNames)
    const boundedSelf = scheduleExpressionIsBounded(checker)

    const boundCallResult = (call: ts.CallExpression) => {
      const callee = unwrapCallee(call.expression)
      const boundByName = isBoundName(callee)
      const foreverMatch = isForeverName(callee)
      const baseMatch = isBaseName(callee)
      const foreverOrBase = Array.make(foreverMatch, baseMatch)
      const isForeverOrBase = Array.some(foreverOrBase, Boolean)
      const calleeExpression = unwrapTransparentExpression(call.expression)
      const isPropertyAccess = ts.isPropertyAccessExpression(calleeExpression)
      const method = isPropertyAccess ? calleeExpression.name.text : ""
      const receiver = isPropertyAccess ? calleeExpression.expression : call.expression
      const receiverBounded = isPropertyAccess && boundedSelf(receiver)
      const isBoundMethod = HashSet.has(scheduleBoundMethodNames, method)
      const argumentBounded = Array.some(call.arguments, boundedSelf)
      const eitherSideBounded = receiverBounded || argumentBounded
      const methodCombinesBound = isBoundMethod && eitherSideBounded
      const propertyBoundByMethod = isBoundMethod ? methodCombinesBound : receiverBounded
      const propertyBound = isPropertyAccess && propertyBoundByMethod
      const notPropertyAccess = strictEqual(false)(isPropertyAccess)
      const unboundByShape = isForeverOrBase || notPropertyAccess
      const namedOrProperty = boundByName || propertyBound

      return unboundByShape ? boundByName : namedOrProperty
    }

    return pipe(
      Match.value(unwrapped),
      Match.when(ts.isCallExpression, boundCallResult),
      Match.when(ts.isPropertyAccessExpression, isBoundName),
      Match.orElse(Function.constFalse)
    )
  }
