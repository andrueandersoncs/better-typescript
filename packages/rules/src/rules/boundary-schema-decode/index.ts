import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { foldAst } from "../../internal/sources/foldAst.js"

import { enclosingFunctionLike } from "../../internal/support/effectApi/enclosingFunctionLike.js"

import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

import { callIsEffectApi } from "../../internal/builtins/effectQuality/callIsEffectApi.js"

import {
  callIsResponseJson,
  schemaDecodeNames
} from "../../internal/builtins/effectQuality/responseJson.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

const callIsJsonParse = (node: ts.CallExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const isPropertyAccess = ts.isPropertyAccessExpression(expression)

  if (!isPropertyAccess) {
    return isPropertyAccess
  }

  const isParse = strictEqual("parse")(expression.name.text)
  const receiver = unwrapTransparentExpression(expression.expression)
  const isIdentifier = ts.isIdentifier(receiver)
  const receiverText = isIdentifier ? receiver.text : ""
  const isJsonName = strictEqual("JSON")(receiverText)
  const jsonParts = Array.make(isIdentifier, isJsonName)
  const jsonReceiver = Array.every(jsonParts, Boolean)
  const checks = Array.make(isParse, jsonReceiver)

  return Array.every(checks, Boolean)
}

const requestJsonAccess = (expression: ts.Expression) => {
  const access = unwrapTransparentExpression(expression)
  const isPropertyAccess = ts.isPropertyAccessExpression(access)

  if (!isPropertyAccess) {
    return isPropertyAccess
  }

  const receiver = access.expression.getText()
  const isJsonMethod = strictEqual("json")(access.name.text)
  const looksLikeRequest = /request|req|body|payload|event/i.test(receiver)
  const checks = Array.make(isJsonMethod, looksLikeRequest)

  return Array.every(checks, Boolean)
}

const parentDecodesNode = (checker: ts.TypeChecker) => (parent: ts.Node) => {
  if (ts.isCallExpression(parent)) {
    return callIsEffectApi(checker)("Schema")(schemaDecodeNames)(parent)
  }

  const grandparentCall = ts.isCallExpression(parent.parent)

  return grandparentCall
    ? callIsEffectApi(checker)("Schema")(schemaDecodeNames)(parent.parent)
    : grandparentCall
}

const boundarySchemaDecodeCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const responseJson = callIsResponseJson(node)

    if (responseJson) {
      return noSubjectMatches
    }

    const jsonParse = callIsJsonParse(node)
    // request.json is boundary-shaped because it is not the HTTP response rule.
    const requestJson = requestJsonAccess(node.expression)
    const candidates = Array.make(jsonParse, requestJson)

    if (!Array.some(candidates, Boolean)) {
      return noSubjectMatches
    }

    // Quiet when decode is composed directly around this node because Schema already validates.
    const parentDecodes = pipe(
      Option.fromNullishOr(node.parent),
      Option.exists(parentDecodesNode(context.checker))
    )

    const nearbyDecodeStep = (found: boolean) => (current: ts.Node) => {
      const isCall = ts.isCallExpression(current)

      const isDecodeCall =
        isCall && callIsEffectApi(context.checker)("Schema")(schemaDecodeNames)(current)

      const signals = Array.make(found, isDecodeCall)

      return Array.some(signals, Boolean)
    }

    const uncurriedStep = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      nearbyDecodeStep(found)(current)
    )

    const scan = Function.flip(foldAst(uncurriedStep))(false)
    const nearbyDecode = pipe(enclosingFunctionLike(node), Option.exists(scan))
    const alreadyDecoded = Array.make(parentDecodes, nearbyDecode)

    if (Array.some(alreadyDecoded, Boolean)) {
      return noSubjectMatches
    }

    const subject = jsonParse ? "JSON.parse" : node.expression.getText()
    const finding = makeSubjectMatch(subject)(node.expression)

    return Array.of(finding)
  }

const boundarySchemaDecodeScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  boundarySchemaDecodeCandidates
)

export const boundarySchemaDecode = makeRule("boundary-schema-decode")(boundarySchemaDecodeScanner)(
  fixedRuleMessage(
    "Decode unknown boundary data.",
    "Use Schema.decodeUnknownEffect or a boundary-specific decoder before consuming the value."
  )
)
