import { Array, Function, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { ArchitectureRole } from "../support/architectureRole.js"
import { propertyNameText, unwrapTransparentExpression } from "../support/tsNode.js"
import { isTestRole } from "./architectureRoles.js"
import { emptyAdviceFindings, makeAdviceFinding } from "./makeFindings.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import {
  cacheMakeNames,
  callIsEffectApi,
  isProductionRole,
  newMapBindingName
} from "./evidenceSupport.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const cacheNamePattern = /cache/i

const ttlFieldPattern = /^(expires?(At)?|expiry|ttl|deadline|validUntil|staleAt)$/i

const propertyAssignmentName = (assignment: ts.PropertyAssignment) => Option.some(assignment.name)

const shorthandPropertyAssignmentName = (assignment: ts.ShorthandPropertyAssignment) =>
  Option.some(assignment.name)

const propertyNameOption = (property: ts.ObjectLiteralElementLike) =>
  pipe(
    Match.value(property),
    Match.when(ts.isPropertyAssignment, propertyAssignmentName),
    Match.when(ts.isShorthandPropertyAssignment, shorthandPropertyAssignmentName),
    Match.orElse(() => Option.none())
  )

const propertyHasTtlName = (property: ts.ObjectLiteralElementLike) =>
  pipe(
    propertyNameOption(property),
    Option.flatMap(propertyNameText),
    Option.exists((name) => ttlFieldPattern.test(name))
  )

const objectLiteralHasTtlField = (expression: ts.Expression) => {
  const current = unwrapTransparentExpression(expression)
  const isObjectLiteral = ts.isObjectLiteralExpression(current)

  return isObjectLiteral ? Array.some(current.properties, propertyHasTtlName) : isObjectLiteral
}

export const cachePreference =
  (context: CheckContext) =>
  (role: ArchitectureRole) =>
  (node: ts.Node): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const skip = Array.make(testRole, nonProduction)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    // Prefer soft Map-as-cache signals because handrolled-ttl-cache owns the complete TTL pattern.
    if (ts.isNewExpression(node)) {
      return pipe(
        newMapBindingName(node),
        Option.filter((name) => cacheNamePattern.test(name)),
        Option.map((name) => {
          const subject = `new Map (${name})`

          return makeAdviceFinding("cache-preference")(subject)(node.expression)
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
    const hasTtlValue = pipe(valueOption, Option.exists(objectLiteralHasTtlField))

    if (!hasTtlValue) {
      return emptyAdviceFindings
    }

    // Skip when Effect Cache is already constructed because the preference is satisfied.
    const usesEffectCacheReducer = (found: boolean, current: ts.Node) => {
      const isCall = ts.isCallExpression(current)

      const isCacheMake =
        isCall && callIsEffectApi(context.checker)("Cache")(cacheMakeNames)(current)

      const signals = Array.make(found, isCacheMake)

      return Array.some(signals, Boolean)
    }

    const usesEffectCache = foldAst(usesEffectCacheReducer)(context.sourceFile)(false)

    if (usesEffectCache) {
      return emptyAdviceFindings
    }

    const finding = makeAdviceFinding("cache-preference")("Map.set with TTL field")(node.expression)

    return Array.of(finding)
  }
