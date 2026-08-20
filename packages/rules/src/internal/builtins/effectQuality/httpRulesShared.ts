import { Array, Function, Option, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../equivalence.js"

import { foldAst } from "../../sources/foldAst.js"

import type { ImportedMember } from "../../support/effectApi/importedMember.js"

import { importedMemberAt } from "../../support/effectApi/importedMemberAt.js"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

import { unwrapCallee } from "../../support/unwrapCallee.js"

import { memberLastName } from "./memberLastName.js"

import { schemaDecodeNames } from "./responseJson.js"

export const callIsImportedApi =
  (predicate: (member: ImportedMember) => boolean) =>
  (checker: ts.TypeChecker) =>
  (expression: ts.Expression) => {
    const unwrapped = unwrapTransparentExpression(expression)
    const callee = unwrapCallee(unwrapped)
    const member = importedMemberAt(checker)(callee)

    return Option.exists(member, predicate)
  }

export const httpNamespaceNames = Array.make(
  "HttpClient",
  "HttpClientResponse",
  "HttpClientRequest",
  "FetchHttpClient"
)

export const segmentIsHttpNamespace = (segment: string) =>
  Array.contains(httpNamespaceNames, segment)

export const moduleIsEffectHttp = (moduleSpecifier: string) => {
  const exactUnstable = strictEqual("effect/unstable/http")(moduleSpecifier)
  const nestedUnstable = moduleSpecifier.startsWith("effect/unstable/http/")
  const platformExact = strictEqual("@effect/platform")(moduleSpecifier)
  const platformNested = moduleSpecifier.startsWith("@effect/platform/")
  const effectHttpNested = moduleSpecifier.startsWith("effect/Http")

  const flags = Array.make(
    exactUnstable,
    nestedUnstable,
    platformExact,
    platformNested,
    effectHttpNested
  )

  return Array.some(flags, Boolean)
}

export const pathMatchesHttpNamespaceApi = (path: ReadonlyArray<string>) => {
  const hasNamespace = Array.some(path, segmentIsHttpNamespace)
  const singleMemberPath = strictEqual(1)(path.length)
  const pathFlags = Array.make(hasNamespace, singleMemberPath)

  return Array.some(pathFlags, Boolean)
}

export const barrelPathMatchesHttpNamespace = (path: ReadonlyArray<string>) => {
  const path0 = Array.get(path, 0)
  const path1 = Array.get(path, 1)
  const path2 = Array.get(path, 2)
  const barrelNamespace = pipe(path0, Option.exists(segmentIsHttpNamespace))
  const unstableNamespace = pipe(path2, Option.exists(segmentIsHttpNamespace))
  const hasUnstable = pipe(path0, Option.contains("unstable"))
  const hasHttp = pipe(path1, Option.contains("http"))
  const unstablePathFlags = Array.make(hasUnstable, hasHttp, unstableNamespace)
  const unstablePath = Array.every(unstablePathFlags, Boolean)
  const barrelFlags = Array.make(barrelNamespace, unstablePath)

  return Array.some(barrelFlags, Boolean)
}

export const memberIsHttpNamespaceApi =
  (names: ReadonlyArray<string>) => (member: ImportedMember) => {
    const last = memberLastName(member)
    const nameMatches = Array.contains(names, last)
    const fromHttpModule = moduleIsEffectHttp(member.moduleSpecifier)
    const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
    const moduleOkFlags = Array.make(fromHttpModule, fromEffectBarrel)
    const moduleOk = Array.some(moduleOkFlags, Boolean)
    const nonEffectBarrel = member.moduleSpecifier !== "effect"
    const nonEffectHttpFlags = Array.make(fromHttpModule, nonEffectBarrel)
    const nonEffectHttpModule = Array.every(nonEffectHttpFlags, Boolean)

    const pathMatches = nonEffectHttpModule
      ? pathMatchesHttpNamespaceApi(member.path)
      : barrelPathMatchesHttpNamespace(member.path)

    const flags = Array.make(nameMatches, moduleOk, pathMatches)

    return Array.every(flags, Boolean)
  }

export const httpResponseSchemaNames = Array.make("schemaBodyJson", "schemaJson", "schemaNoBody")

export const callIsHttpResponseSchema = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  callIsImportedApi(memberIsHttpNamespaceApi(httpResponseSchemaNames))(checker)(call.expression)

export const moduleIsEffectSchema = (moduleSpecifier: string) => {
  const fromBarrel = strictEqual("effect")(moduleSpecifier)
  const fromSchema = strictEqual("effect/Schema")(moduleSpecifier)
  const fromSchemaNested = moduleSpecifier.startsWith("effect/Schema/")
  const flags = Array.make(fromBarrel, fromSchema, fromSchemaNested)

  return Array.some(flags, Boolean)
}

export const memberIsSchemaDecodeApi = (member: ImportedMember) => {
  const schemaModule = moduleIsEffectSchema(member.moduleSpecifier)
  const last = memberLastName(member)
  const nameMatches = Array.contains(schemaDecodeNames, last)
  const fromEffectBarrel = strictEqual("effect")(member.moduleSpecifier)
  const schemaPathHead = Array.get(member.path, 0)
  const barrelSchemaPath = pipe(schemaPathHead, Option.contains("Schema"))
  const pathOk = fromEffectBarrel ? barrelSchemaPath : true
  const flags = Array.make(schemaModule, nameMatches, pathOk)

  return Array.every(flags, Boolean)
}

export const callIsSchemaDecode = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  callIsImportedApi(memberIsSchemaDecodeApi)(checker)(call.expression)

export const bodyContainsAny =
  (predicate: (node: ts.Node) => boolean) => (found: boolean) => (current: ts.Node) =>
    found || predicate(current)

export const functionBodyContains =
  (predicate: (node: ts.Node) => boolean) => (body: ts.ConciseBody) => {
    const step = bodyContainsAny(predicate)

    const uncurriedStep = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      step(found)(current)
    )

    const scan = Function.flip(foldAst(uncurriedStep))(false)

    return scan(body)
  }

export const functionBodyOf = (fn: ts.FunctionLikeDeclaration) => Option.fromNullishOr(fn.body)

export const tryPromiseNames = Array.of("tryPromise")

export const isAmbientFetchCallee = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const current = unwrapTransparentExpression(expression)
  const isIdentifier = ts.isIdentifier(current)
  const identifierText = isIdentifier ? current.text : ""
  const isFetchName = strictEqual("fetch")(identifierText)
  const isFetchIdentifier = Array.make(isIdentifier, isFetchName)
  const isFetch = Array.every(isFetchIdentifier, Boolean)

  if (!isFetch) {
    return isFetch
  }

  return pipe(
    checker.getSymbolAtLocation(current),
    Option.fromNullishOr,
    Option.exists((symbol) => {
      const declarations = symbol.declarations ?? Array.empty()

      const hasAmbientDeclaration = Array.some(declarations, (declaration) => {
        const file = declaration.getSourceFile()
        const isDomFile = file.fileName.includes("lib.dom")
        const isDomLibParts = Array.make(file.isDeclarationFile, isDomFile)
        const isDomLib = Array.every(isDomLibParts, Boolean)
        const hasFunctionFlag = (symbol.flags & ts.SymbolFlags.Function) !== 0
        const hasNoDeclarations = strictEqual(0)(declarations.length)
        const globalParts = Array.make(hasFunctionFlag, hasNoDeclarations)
        const isGlobalFunction = Array.every(globalParts, Boolean)
        const ambientConditions = Array.make(isDomLib, isGlobalFunction)

        return Array.some(ambientConditions, Boolean)
      })

      // Prefer ambient fetch because local bare bindings still represent the global API.
      const imported = importedMemberAt(checker)(current)
      const isUnimported = Option.isNone(imported)
      const ambientOrUnimported = Array.make(isUnimported, hasAmbientDeclaration)

      return Array.some(ambientOrUnimported, Boolean)
    })
  )
}

export const isBareFetchCall = (checker: ts.TypeChecker) =>
  flow(Struct.get<ts.CallExpression, "expression">("expression"), isAmbientFetchCallee(checker))
