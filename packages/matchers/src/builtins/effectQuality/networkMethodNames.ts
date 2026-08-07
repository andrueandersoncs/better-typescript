import { Array, Function, Option, pipe } from "effect"

import * as ts from "typescript"

import type { MatchContext } from "../../matcher/matchContext.js"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

import { importedMemberAt } from "../functionalCoreEffect/importedMemberAt.js"

import { isBareFetchCall } from "./isAmbientFetchCallee.js"

import { isFetchHttpClientMember } from "./isFetchHttpClientMember.js"

import { isHttpClientMember } from "./isHttpClientMember.js"

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

export const callLooksLikeNetworkClient = (context: MatchContext) => (node: ts.CallExpression) => {
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
