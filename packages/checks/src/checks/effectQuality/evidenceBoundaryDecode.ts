import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { ArchitectureRole } from "../support/architectureRole.js"
import { enclosingFunctionLike } from "../functionalCoreEffect/support.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"
import { isTestRole } from "./architectureRoles.js"
import { callIsResponseJson } from "./effectIdentity.js"
import { emptyAdviceFindings, makeAdviceFinding } from "./makeFindings.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import { callIsEffectApi, isProductionRole } from "./evidenceSupport.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const schemaDecodeNames = Array.make(
  "decodeUnknownEffect",
  "decodeUnknown",
  "decodeUnknownSync",
  "decodeUnknownOption",
  "decodeUnknownExit",
  "decodeUnknownResult",
  "decodeUnknownPromise",
  "decodeEffect",
  "decodeSync"
)

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

  const method = access.name.text
  const receiver = access.expression.getText()
  const isJsonMethod = strictEqual("json")(method)
  const looksLikeRequest = /request|req|body|payload|event/i.test(receiver)
  const checks = Array.make(isJsonMethod, looksLikeRequest)

  return Array.every(checks, Boolean)
}

const parentDecodesNode = (checker: ts.TypeChecker) => (parent: ts.Node) => {
  if (ts.isCallExpression(parent)) {
    return callIsEffectApi(checker)("Schema")(schemaDecodeNames)(parent)
  }

  const grandparent = parent.parent
  const grandparentCall = ts.isCallExpression(grandparent)

  return grandparentCall
    ? callIsEffectApi(checker)("Schema")(schemaDecodeNames)(grandparent)
    : grandparentCall
}

export const boundarySchemaDecode =
  (context: CheckContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const responseJson = callIsResponseJson(node)
    const skip = Array.make(testRole, nonProduction, responseJson)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const jsonParse = callIsJsonParse(node)
    // request.json is boundary-shaped because it is not the HTTP response rule.
    const requestJson = requestJsonAccess(node.expression)
    const candidates = Array.make(jsonParse, requestJson)

    if (!Array.some(candidates, Boolean)) {
      return emptyAdviceFindings
    }

    // Quiet when decode is composed directly around this node because Schema already validates.
    const parentDecodes = pipe(
      Option.fromNullishOr(node.parent),
      Option.exists(parentDecodesNode(context.checker))
    )

    const nearbyDecodeReducer = (found: boolean, current: ts.Node) => {
      const isCall = ts.isCallExpression(current)

      const isDecodeCall =
        isCall && callIsEffectApi(context.checker)("Schema")(schemaDecodeNames)(current)

      const signals = Array.make(found, isDecodeCall)

      return Array.some(signals, Boolean)
    }

    const scan = Function.flip(foldAst(nearbyDecodeReducer))(false)
    const nearbyDecode = pipe(enclosingFunctionLike(node), Option.exists(scan))
    const alreadyDecoded = Array.make(parentDecodes, nearbyDecode)

    if (Array.some(alreadyDecoded, Boolean)) {
      return emptyAdviceFindings
    }

    const subject = jsonParse ? "JSON.parse" : node.expression.getText()
    const finding = makeAdviceFinding("boundary-schema-decode")(subject)(node.expression)

    return Array.of(finding)
  }
