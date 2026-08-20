import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Match as EffectMatch, Function, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { foldAst } from "../../internal/sources/foldAst.js"

import { hasEffectCallAncestor } from "../../internal/support/effectApi/hasEffectCallAncestor.js"

import type { ImportedMember } from "../../internal/support/effectApi/importedMember.js"

import { importedMemberAt } from "../../internal/support/effectApi/importedMemberAt.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

import {
  tryPromiseNames,
  isBareFetchCall
} from "../../internal/builtins/effectQuality/httpRulesShared.js"

const isFetchHttpClientMember = (member: ImportedMember) => {
  const direct = strictEqual("effect/unstable/http/FetchHttpClient")(member.moduleSpecifier)
  const isHttpBarrel = strictEqual("effect/unstable/http")(member.moduleSpecifier)
  const pathHead = Array.head(member.path)
  const pathHeadIsFetchHttpClient = pipe(pathHead, Option.contains("FetchHttpClient"))
  const httpBarrelParts = Array.make(isHttpBarrel, pathHeadIsFetchHttpClient)
  const httpBarrel = Array.every(httpBarrelParts, Boolean)
  const path0 = Array.get(member.path, 0)
  const path1 = Array.get(member.path, 1)
  const path2 = Array.get(member.path, 2)
  const effectPath0 = pipe(path0, Option.contains("unstable"))
  const effectPath1 = pipe(path1, Option.contains("http"))
  const effectPath2 = pipe(path2, Option.contains("FetchHttpClient"))
  const effectModule = strictEqual("effect")(member.moduleSpecifier)
  const effectParts = Array.make(effectModule, effectPath0, effectPath1, effectPath2)
  const effectBarrel = Array.every(effectParts, Boolean)
  const sources = Array.make(direct, httpBarrel, effectBarrel)

  return Array.some(sources, Boolean)
}

const isHttpClientMember = (member: ImportedMember) => {
  const direct = strictEqual("effect/unstable/http/HttpClient")(member.moduleSpecifier)
  const isHttpBarrel = strictEqual("effect/unstable/http")(member.moduleSpecifier)
  const pathHead = Array.head(member.path)
  const pathHeadIsHttpClient = pipe(pathHead, Option.contains("HttpClient"))
  const httpBarrelParts = Array.make(isHttpBarrel, pathHeadIsHttpClient)
  const httpBarrel = Array.every(httpBarrelParts, Boolean)
  const path0 = Array.get(member.path, 0)
  const path1 = Array.get(member.path, 1)
  const path2 = Array.get(member.path, 2)
  const unstablePath0 = pipe(path0, Option.contains("http"))
  const unstablePath1 = pipe(path1, Option.contains("HttpClient"))
  const unstableModule = strictEqual("effect/unstable")(member.moduleSpecifier)
  const unstableParts = Array.make(unstableModule, unstablePath0, unstablePath1)
  const unstableBarrel = Array.every(unstableParts, Boolean)
  const effectPath0 = pipe(path0, Option.contains("unstable"))
  const effectPath1 = pipe(path1, Option.contains("http"))
  const effectPath2 = pipe(path2, Option.contains("HttpClient"))
  const effectModule = strictEqual("effect")(member.moduleSpecifier)
  const effectParts = Array.make(effectModule, effectPath0, effectPath1, effectPath2)
  const effectBarrel = Array.every(effectParts, Boolean)
  const sources = Array.make(direct, httpBarrel, unstableBarrel, effectBarrel)

  return Array.some(sources, Boolean)
}

const httpClientPreferenceCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const bareFetch = isBareFetchCall(context.checker)(node)
    const insideTryPromise = hasEffectCallAncestor(context.checker)("Effect")(tryPromiseNames)(node)
    const ignoreHttpClientPreferenceReasons = Array.make(!bareFetch, !insideTryPromise)
    const shouldIgnoreHttpClientPreference = Array.some(ignoreHttpClientPreferenceReasons, Boolean)

    if (shouldIgnoreHttpClientPreference) {
      return noSubjectMatches
    }

    // Quiet when the file already wires HttpClient because preference is already met.
    const memberUsesHttpClient = (member: ImportedMember) => {
      const http = isHttpClientMember(member)
      const fetchHttp = isFetchHttpClientMember(member)
      const members = Array.make(http, fetchHttp)

      return Array.some(members, Boolean)
    }

    const expressionUsesHttpClient = (expression: ts.Expression) =>
      pipe(importedMemberAt(context.checker)(expression), Option.exists(memberUsesHttpClient))

    const currentUsesHttpClient = (current: ts.Node) =>
      pipe(
        EffectMatch.value(current),
        EffectMatch.when(ts.isIdentifier, expressionUsesHttpClient),
        EffectMatch.when(ts.isPropertyAccessExpression, expressionUsesHttpClient),
        EffectMatch.orElse(Function.constFalse)
      )

    const fileUsesHttpClientStep = (found: boolean) => (current: ts.Node) => {
      const usesHttpClient = currentUsesHttpClient(current)
      const signals = Array.make(found, usesHttpClient)

      return Array.some(signals, Boolean)
    }

    const uncurriedStep = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      fileUsesHttpClientStep(found)(current)
    )

    const fileUsesHttpClient = foldAst(uncurriedStep)(context.sourceFile)(false)

    if (fileUsesHttpClient) {
      return noSubjectMatches
    }

    const finding = makeSubjectMatch("fetch")(node.expression)

    return Array.of(finding)
  }

const httpClientPreferenceScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  httpClientPreferenceCandidates
)

export const httpClientPreference = makeRule("http-client-preference")(httpClientPreferenceScanner)(
  fixedRuleMessage(
    "Prefer Effect HttpClient for HTTP adapters.",
    "Use Effect's typed HTTP client unless a documented raw-fetch exception applies."
  )
)
