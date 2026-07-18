import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { importedMemberAt, type ImportedMember } from "../functionalCoreEffect/support.js"
import { unwrapTransparentExpression } from "../support/tsNode.js"

export const isAmbientFetchCallee = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const current = unwrapTransparentExpression(expression)
  const isIdentifier = ts.isIdentifier(current)
  const identifierText = isIdentifier ? current.text : ""
  const isFetchName = identifierText === "fetch"
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
        const hasNoDeclarations = declarations.length === 0
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

export const isBareFetchCall = (checker: ts.TypeChecker) => (node: ts.CallExpression) =>
  isAmbientFetchCallee(checker)(node.expression)

export const isHttpClientMember = (member: ImportedMember) => {
  const specifier = member.moduleSpecifier
  const path = member.path
  const direct = specifier === "effect/unstable/http/HttpClient"
  const isHttpBarrel = specifier === "effect/unstable/http"
  const pathHeadIsHttpClient = pipe(Array.head(path), Option.contains("HttpClient"))
  const httpBarrelParts = Array.make(isHttpBarrel, pathHeadIsHttpClient)
  const httpBarrel = Array.every(httpBarrelParts, Boolean)
  const unstablePath0 = path[0] === "http"
  const unstablePath1 = pipe(Option.fromNullishOr(path[1]), Option.contains("HttpClient"))
  const unstableModule = specifier === "effect/unstable"
  const unstableParts = Array.make(unstableModule, unstablePath0, unstablePath1)
  const unstableBarrel = Array.every(unstableParts, Boolean)
  const effectPath0 = path[0] === "unstable"
  const effectPath1 = path[1] === "http"
  const effectPath2 = pipe(Option.fromNullishOr(path[2]), Option.contains("HttpClient"))
  const effectModule = specifier === "effect"
  const effectParts = Array.make(effectModule, effectPath0, effectPath1, effectPath2)
  const effectBarrel = Array.every(effectParts, Boolean)
  const sources = Array.make(direct, httpBarrel, unstableBarrel, effectBarrel)

  return Array.some(sources, Boolean)
}

export const isFetchHttpClientMember = (member: ImportedMember) => {
  const specifier = member.moduleSpecifier
  const path = member.path
  const direct = specifier === "effect/unstable/http/FetchHttpClient"
  const isHttpBarrel = specifier === "effect/unstable/http"
  const pathHeadIsFetchHttpClient = pipe(Array.head(path), Option.contains("FetchHttpClient"))
  const httpBarrelParts = Array.make(isHttpBarrel, pathHeadIsFetchHttpClient)
  const httpBarrel = Array.every(httpBarrelParts, Boolean)
  const effectPath0 = path[0] === "unstable"
  const effectPath1 = path[1] === "http"
  const effectPath2 = pipe(Option.fromNullishOr(path[2]), Option.contains("FetchHttpClient"))
  const effectModule = specifier === "effect"
  const effectParts = Array.make(effectModule, effectPath0, effectPath1, effectPath2)
  const effectBarrel = Array.every(effectParts, Boolean)
  const sources = Array.make(direct, httpBarrel, effectBarrel)

  return Array.some(sources, Boolean)
}
