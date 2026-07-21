import { Array, Option, pipe, Struct, flow } from "effect"
import * as ts from "typescript"
import { importedMemberAt, type ImportedMember } from "../functionalCoreEffect/support.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

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
        const isDeclarationFile = file.isDeclarationFile
        const isDomFile = file.fileName.includes("lib.dom")
        const isDomLibParts = Array.make(isDeclarationFile, isDomFile)
        const isDomLib = Array.every(isDomLibParts, Boolean)
        const hasFunctionFlag = (symbol.flags & ts.SymbolFlags.Function) !== 0
        const hasNoDeclarations = strictEqual(0)(declarations.length)
        const globalParts = Array.make(hasFunctionFlag, hasNoDeclarations)
        const isGlobalFunction = Array.every(globalParts, Boolean)
        const ambientConditions = Array.make(isDomLib, isGlobalFunction)

        return Array.some(ambientConditions, Boolean)
      })

      // Prefer ambient fetch because local bare bindings still represent the global API.
      const imported = importedMemberAt(checker, current)
      const isUnimported = Option.isNone(imported)
      const ambientOrUnimported = Array.make(isUnimported, hasAmbientDeclaration)

      return Array.some(ambientOrUnimported, Boolean)
    })
  )
}

export const isBareFetchCall = (checker: ts.TypeChecker) =>
  flow(Struct.get<ts.CallExpression, "expression">("expression"), isAmbientFetchCallee(checker))

export const isHttpClientMember = (member: ImportedMember) => {
  const specifier = member.moduleSpecifier
  const path = member.path
  const direct = strictEqual("effect/unstable/http/HttpClient")(specifier)
  const isHttpBarrel = strictEqual("effect/unstable/http")(specifier)
  const pathHead = Array.head(path)
  const pathHeadIsHttpClient = pipe(pathHead, Option.contains("HttpClient"))
  const httpBarrelParts = Array.make(isHttpBarrel, pathHeadIsHttpClient)
  const httpBarrel = Array.every(httpBarrelParts, Boolean)
  const path0 = Array.get(path, 0)
  const path1 = Array.get(path, 1)
  const path2 = Array.get(path, 2)
  const unstablePath0 = pipe(path0, Option.contains("http"))
  const unstablePath1 = pipe(path1, Option.contains("HttpClient"))
  const unstableModule = strictEqual("effect/unstable")(specifier)
  const unstableParts = Array.make(unstableModule, unstablePath0, unstablePath1)
  const unstableBarrel = Array.every(unstableParts, Boolean)
  const effectPath0 = pipe(path0, Option.contains("unstable"))
  const effectPath1 = pipe(path1, Option.contains("http"))
  const effectPath2 = pipe(path2, Option.contains("HttpClient"))
  const effectModule = strictEqual("effect")(specifier)
  const effectParts = Array.make(effectModule, effectPath0, effectPath1, effectPath2)
  const effectBarrel = Array.every(effectParts, Boolean)
  const sources = Array.make(direct, httpBarrel, unstableBarrel, effectBarrel)

  return Array.some(sources, Boolean)
}

export const isFetchHttpClientMember = (member: ImportedMember) => {
  const specifier = member.moduleSpecifier
  const path = member.path
  const direct = strictEqual("effect/unstable/http/FetchHttpClient")(specifier)
  const isHttpBarrel = strictEqual("effect/unstable/http")(specifier)
  const pathHead = Array.head(path)
  const pathHeadIsFetchHttpClient = pipe(pathHead, Option.contains("FetchHttpClient"))
  const httpBarrelParts = Array.make(isHttpBarrel, pathHeadIsFetchHttpClient)
  const httpBarrel = Array.every(httpBarrelParts, Boolean)
  const path0 = Array.get(path, 0)
  const path1 = Array.get(path, 1)
  const path2 = Array.get(path, 2)
  const effectPath0 = pipe(path0, Option.contains("unstable"))
  const effectPath1 = pipe(path1, Option.contains("http"))
  const effectPath2 = pipe(path2, Option.contains("FetchHttpClient"))
  const effectModule = strictEqual("effect")(specifier)
  const effectParts = Array.make(effectModule, effectPath0, effectPath1, effectPath2)
  const effectBarrel = Array.every(effectParts, Boolean)
  const sources = Array.make(direct, httpBarrel, effectBarrel)

  return Array.some(sources, Boolean)
}
