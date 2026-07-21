import { Array, Function, Match, Option, pipe, Struct, flow } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { ArchitectureRole } from "../support/architectureRole.js"
import {
  importedMemberAt,
  isAdapterOrRootRole,
  type ImportedMember
} from "../functionalCoreEffect/support.js"
import { isAdapterRole, isTestRole } from "./architectureRoles.js"
import { emptyAdviceFindings, makeAdviceFinding } from "./makeFindings.js"
import type { EffectQualityIndex } from "./index.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import { isProductionRole } from "./evidenceSupport.js"
import {
  isBareFetchCall,
  isFetchHttpClientMember,
  isHttpClientMember
} from "./evidenceHttpBoundaryShared.js"

const relativeSourcePath = (index: EffectQualityIndex) =>
  flow(Struct.get<ts.SourceFile, "fileName">("fileName"), toRelativeFileName(index.projectRoot))

export const rawFetchOutsideAdapter =
  (context: CheckContext) =>
  (index: EffectQualityIndex) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    if (!isBareFetchCall(context.checker)(node)) {
      return emptyAdviceFindings
    }

    const adapterOrRoot = isAdapterOrRootRole(role)
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const relative = relativeSourcePath(index)(context.sourceFile)
    const exception = index.policy.rawFetchException(relative)
    const skipRoles = Array.make(adapterOrRoot, testRole, nonProduction, exception)

    if (Array.some(skipRoles, Boolean)) {
      return emptyAdviceFindings
    }

    const finding = makeAdviceFinding("raw-fetch-outside-adapter")("fetch")(node.expression)

    return Array.of(finding)
  }

export const httpClientPreference =
  (context: CheckContext) =>
  (index: EffectQualityIndex) =>
  (role: ArchitectureRole) =>
  (node: ts.CallExpression): ReadonlyArray<EffectQualityAdviceFinding> => {
    // Prefer Effect HttpClient inside adapters because outside-adapter raw fetch is separate advice.
    const notAdapter = !isAdapterRole(role)
    const notBareFetch = !isBareFetchCall(context.checker)(node)
    const skip = Array.make(notAdapter, notBareFetch)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const relative = relativeSourcePath(index)(context.sourceFile)

    if (index.policy.rawFetchException(relative)) {
      return emptyAdviceFindings
    }

    // Quiet when the file already wires HttpClient because preference is already met.
    const memberUsesHttpClient = (member: ImportedMember) => {
      const http = isHttpClientMember(member)
      const fetchHttp = isFetchHttpClientMember(member)
      const members = Array.make(http, fetchHttp)

      return Array.some(members, Boolean)
    }

    const expressionUsesHttpClient = (expression: ts.Expression) =>
      pipe(importedMemberAt(context.checker, expression), Option.exists(memberUsesHttpClient))

    const currentUsesHttpClient = (current: ts.Node) =>
      pipe(
        Match.value(current),
        Match.when(ts.isIdentifier, expressionUsesHttpClient),
        Match.when(ts.isPropertyAccessExpression, expressionUsesHttpClient),
        Match.orElse(Function.constFalse)
      )

    const fileUsesHttpClientReducer = (found: boolean, current: ts.Node) => {
      const usesHttpClient = currentUsesHttpClient(current)
      const signals = Array.make(found, usesHttpClient)

      return Array.some(signals, Boolean)
    }

    const fileUsesHttpClient = foldAst(fileUsesHttpClientReducer)(context.sourceFile)(false)

    if (fileUsesHttpClient) {
      return emptyAdviceFindings
    }

    const finding = makeAdviceFinding("http-client-preference")("fetch")(node.expression)

    return Array.of(finding)
  }
