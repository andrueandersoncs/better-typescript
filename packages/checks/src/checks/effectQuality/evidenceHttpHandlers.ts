import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { ArchitectureRole } from "../support/architectureRole.js"
import { importedMemberAt } from "../functionalCoreEffect/support.js"
import { ancestorMatching } from "./astQueries.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"
import { isTestRole } from "./architectureRoles.js"
import { emptyAdviceFindings, makeAdviceFinding } from "./makeFindings.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import { enclosingFunctionName, isProductionRole } from "./evidenceSupport.js"
import {
  isBareFetchCall,
  isFetchHttpClientMember,
  isHttpClientMember
} from "./evidenceHttpBoundaryShared.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const handlerNamePattern = /(?:handler|route|controller|endpoint|resolve|loader|action)$/i

const transactionNamePattern =
  /(?:transaction|withTransaction|useTransaction|transact|inTransaction)/i

const networkMethodNames = Array.make(
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "request",
  "execute",
  "fetch"
)

const calleeMethodName = (expression: ts.Expression) => {
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text
  }

  return ts.isIdentifier(expression) ? expression.text : ""
}

const callLooksLikeNetworkClient = (context: CheckContext) => (node: ts.CallExpression) => {
  const fetchCall = isBareFetchCall(context.checker)(node)

  const httpClient = pipe(
    importedMemberAt(context.checker, node.expression),
    Option.exists((member) => {
      const http = isHttpClientMember(member)
      const fetchHttp = isFetchHttpClientMember(member)
      const members = Array.make(http, fetchHttp)

      return Array.some(members, Boolean)
    })
  )

  const unwrappedExpression = unwrapTransparentExpression(node.expression)

  const methodName = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(unwrappedExpression),
    Option.map((access) => access.name.text),
    Option.getOrElse(Function.constant(""))
  )

  const networkMethod = Array.contains(networkMethodNames, methodName)
  const signals = Array.make(fetchCall, httpClient, networkMethod)

  return Array.some(signals, Boolean)
}

const persistenceMethodNames = Array.make(
  "query",
  "insert",
  "update",
  "delete",
  "upsert",
  "execute",
  "transaction",
  "withTransaction",
  "save",
  "write",
  "create",
  "remove"
)

const callLooksLikePersistence = (node: ts.CallExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const methodName = calleeMethodName(expression)

  return Array.contains(persistenceMethodNames, methodName)
}

const isInsideNamedCallback = (pattern: RegExp) => (node: ts.Node) =>
  pipe(
    enclosingFunctionName(node),
    Option.exists((name) => pattern.test(name))
  )

const isInsideTransactionCallback = (node: ts.Node) => {
  const named = isInsideNamedCallback(transactionNamePattern)(node)

  const callNamed = pipe(
    ancestorMatching(ts.isCallExpression)(node),
    Option.exists((call) => {
      const expression = unwrapTransparentExpression(call.expression)
      const method = calleeMethodName(expression)

      return transactionNamePattern.test(method)
    })
  )

  const signals = Array.make(named, callNamed)

  return Array.some(signals, Boolean)
}

export const thinHttpHandlers =
  (context: CheckContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    // Prefer adapter/application HTTP edges because composition roots own wiring.
    const isAdapter = strictEqual("adapter")(role)
    const isApplication = strictEqual("application")(role)
    const allowedRoles = Array.make(isAdapter, isApplication)
    const allowedRole = Array.some(allowedRoles, Boolean)
    const outsideHandler = !isInsideNamedCallback(handlerNamePattern)(node)
    const skip = Array.make(!allowedRole, outsideHandler)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    // FCE already reports non-root provide* because this check is about handler-local persistence.
    const persistence = callLooksLikePersistence(node)
    const networkCall = callLooksLikeNetworkClient(context)(node)
    const networkParts = Array.make(networkCall, isApplication)
    const networkInApplication = Array.every(networkParts, Boolean)
    const signals = Array.make(persistence, networkInApplication)

    if (!Array.some(signals, Boolean)) {
      return emptyAdviceFindings
    }

    const subject = node.expression.getText()
    const finding = makeAdviceFinding("thin-http-handlers")(subject)(node.expression)

    return Array.of(finding)
  }

export const transactionNetworkWork =
  (context: CheckContext) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const outsideTransaction = !isInsideTransactionCallback(node)
    const notNetwork = !callLooksLikeNetworkClient(context)(node)
    const skip = Array.make(testRole, nonProduction, outsideTransaction, notNetwork)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const subject = node.expression.getText()
    const finding = makeAdviceFinding("transaction-network-work")(subject)(node.expression)

    return Array.of(finding)
  }
