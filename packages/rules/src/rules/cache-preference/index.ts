import { Array, Function, Match, Option, Struct, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { foldAst } from "../../internal/sources/foldAst.js"

import { propertyNameText } from "../../internal/support/propertyNameText.js"

import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

import { callIsEffectApi } from "../../internal/builtins/effectQuality/callIsEffectApi.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

import { cacheMakeNames } from "../../internal/builtins/effectQuality/cacheRulesShared.js"

const assignmentBindingName = (parent: ts.BinaryExpression) => {
  const isEquals = strictEqual(ts.SyntaxKind.EqualsToken)(parent.operatorToken.kind)

  if (!isEquals) {
    return Option.none<string>()
  }

  const left = unwrapTransparentExpression(parent.left)
  const isIdentifier = ts.isIdentifier(left)

  return isIdentifier ? Option.some(left.text) : Option.none()
}

const newMapBindingName = (node: ts.NewExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const identifierMap = ts.isIdentifier(expression)
  const identifierText = identifierMap ? expression.text : ""
  const identifierIsMap = strictEqual("Map")(identifierText)
  const propertyMap = ts.isPropertyAccessExpression(expression)
  const propertyText = propertyMap ? expression.name.text : ""
  const propertyIsMap = strictEqual("Map")(propertyText)
  const mapIdentifier = Array.make(identifierMap, identifierIsMap)
  const mapProperty = Array.make(propertyMap, propertyIsMap)
  const isIdentifierMap = Array.every(mapIdentifier, Boolean)
  const isPropertyMap = Array.every(mapProperty, Boolean)
  const isMap = Array.make(isIdentifierMap, isPropertyMap)

  if (!Array.some(isMap, Boolean)) {
    return Option.none()
  }

  return pipe(
    Option.fromNullishOr(node.parent),
    Option.flatMap((parent) => {
      const variableName = pipe(
        Option.some(parent),
        Option.filter(ts.isVariableDeclaration),
        Option.map(Struct.get("name")),
        Option.filter(ts.isIdentifier),
        Option.map(Struct.get("text"))
      )

      if (Option.isSome(variableName)) {
        return variableName
      }

      if (ts.isBinaryExpression(parent)) {
        return assignmentBindingName(parent)
      }

      return pipe(
        Option.some(parent),
        Option.filter(ts.isPropertyAssignment),
        Option.map(Struct.get("name")),
        Option.flatMap(propertyNameText)
      )
    })
  )
}

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

const cachePreferenceCandidates =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    // Prefer soft Map-as-cache signals because handrolled-ttl-cache owns the complete TTL pattern.
    if (ts.isNewExpression(node)) {
      return pipe(
        newMapBindingName(node),
        Option.filter((name) => cacheNamePattern.test(name)),
        Option.map((name) => {
          const subject = `new Map (${name})`

          return makeSubjectMatch(subject)(node.expression)
        }),
        Option.map(Array.of),
        Option.getOrElse(Function.constant(noSubjectMatches))
      )
    }

    if (!ts.isCallExpression(node)) {
      return noSubjectMatches
    }

    const expression = unwrapTransparentExpression(node.expression)
    const isPropertyAccess = ts.isPropertyAccessExpression(expression)

    if (!isPropertyAccess) {
      return noSubjectMatches
    }

    const isSetName = strictEqual("set")(expression.name.text)

    if (!isSetName) {
      return noSubjectMatches
    }

    const valueOption = Option.fromNullishOr(node.arguments[1])
    const hasTtlValue = pipe(valueOption, Option.exists(objectLiteralHasTtlField))

    if (!hasTtlValue) {
      return noSubjectMatches
    }

    // Skip when Effect Cache is already constructed because the preference is satisfied.
    const usesEffectCacheStep = (found: boolean) => (current: ts.Node) => {
      const isCall = ts.isCallExpression(current)

      const isCacheMake =
        isCall && callIsEffectApi(context.checker)("Cache")(cacheMakeNames)(current)

      const signals = Array.make(found, isCacheMake)

      return Array.some(signals, Boolean)
    }

    const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      usesEffectCacheStep(found)(current)
    )

    const usesEffectCache = foldAst(uncurriedReducer)(context.sourceFile)(false)

    if (usesEffectCache) {
      return noSubjectMatches
    }

    const finding = makeSubjectMatch("Map.set with TTL field")(node.expression)

    return Array.of(finding)
  }

const cacheKinds = Array.make(ts.SyntaxKind.CallExpression, ts.SyntaxKind.NewExpression)

const cachePreferenceScanner = makeNodeScanner(cacheKinds)(acceptsNode)(cachePreferenceCandidates)

export const cachePreference = makeRule("cache-preference")(cachePreferenceScanner)(
  fixedRuleMessage(
    "Prefer Effect Cache when its lifecycle semantics fit.",
    "Use Cache.make or Cache.makeWith instead of a hand-rolled cache."
  )
)
