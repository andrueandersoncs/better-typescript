import { Array, Function, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import type { MatchContext } from "../../matcher/matchContext.js"

import type { ArchitectureRole } from "../../support/architectureRoleType.js"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

import { importedEffectApiAt } from "../functionalCoreEffect/importedEffectApiAt.js"

import { callIsEffectApi } from "./callIsEffectApi.js"

import { EffectQualityAdviceFinding } from "./effectQualityAdviceFinding.js"

import { emptyAdviceFindings } from "./emptyAdviceFindings.js"

import { isTestRole } from "./isTestRole.js"

import { makeAdviceFinding } from "./makeAdviceFinding.js"

import { newMapBindingName } from "./newMapBindingName.js"

import { isProductionRole } from "./productionRoles.js"

const fiberTypeNamePattern = /Fiber/i

const fiberMapNames = Array.make("make", "set", "run")

const keyedMapNamePattern = /fiber|workers|inflight|running|keyed/i

const keyedReceiverPattern = /map|fibers|workers|inflight|running|keyed/i

const forkValueNames = Array.make("forkChild", "forkScoped", "forkDetach", "forkIn", "forkDaemon")

export const keyedStreamWork =
  (context: MatchContext) =>
  (role: ArchitectureRole) =>
  (node: ts.Node): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const skip = Array.make(testRole, nonProduction)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const callIsFiberMapApi = (call: ts.CallExpression) =>
      importedEffectApiAt(context.checker, call.expression, "FiberMap", fiberMapNames)

    const usesFiberMap = pipe(
      Option.liftPredicate(ts.isCallExpression)(node),
      Option.exists(callIsFiberMapApi)
    )

    // FiberMap is the preferred helper because its legitimate use should not be advised.
    if (usesFiberMap) {
      return emptyAdviceFindings
    }

    if (ts.isNewExpression(node)) {
      return pipe(
        newMapBindingName(node),
        Option.filter((name) => keyedMapNamePattern.test(name)),
        Option.map((name) => {
          const subject = `new Map (${name})`

          return makeAdviceFinding("keyed-stream-work")(subject)(node.expression)
        }),
        Option.map(Array.of),
        Option.getOrElse(Function.constant(emptyAdviceFindings))
      )
    }

    if (!ts.isCallExpression(node)) {
      return emptyAdviceFindings
    }

    const expression = unwrapTransparentExpression(node.expression)
    const isPropertyAccess = ts.isPropertyAccessExpression(expression)

    if (!isPropertyAccess) {
      return emptyAdviceFindings
    }

    const isSetName = strictEqual("set")(expression.name.text)

    if (!isSetName) {
      return emptyAdviceFindings
    }

    const valueOption = Option.fromNullishOr(node.arguments[1])

    if (Option.isNone(valueOption)) {
      return emptyAdviceFindings
    }

    const valueExpression = unwrapTransparentExpression(valueOption.value)

    const forksEffect = pipe(
      Option.liftPredicate(ts.isCallExpression)(valueExpression),
      Option.exists(callIsEffectApi(context.checker)("Effect")(forkValueNames))
    )

    const valueText = valueOption.value.getText()
    const valueMentionsFiber = fiberTypeNamePattern.test(valueText)
    const receiver = unwrapTransparentExpression(expression.expression)
    const receiverName = ts.isIdentifier(receiver) ? receiver.text : receiver.getText()
    const mapishReceiver = keyedReceiverPattern.test(receiverName)
    const fiberishValue = Array.make(forksEffect, valueMentionsFiber)
    const hasFiberishValue = Array.some(fiberishValue, Boolean)
    const emitParts = Array.make(mapishReceiver, hasFiberishValue)
    const emit = Array.every(emitParts, Boolean)

    if (emit) {
      const subject = `${receiverName}.set`
      const finding = makeAdviceFinding("keyed-stream-work")(subject)(node.expression)

      return Array.of(finding)
    }

    return emptyAdviceFindings
  }
