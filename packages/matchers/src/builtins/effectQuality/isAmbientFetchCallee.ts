import { Array, Option, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import { unwrapTransparentExpression } from "../../support/transparentWrapper.js"

import { importedMemberAt } from "../functionalCoreEffect/importedMemberAt.js"

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
      const imported = importedMemberAt(checker, current)
      const isUnimported = Option.isNone(imported)
      const ambientOrUnimported = Array.make(isUnimported, hasAmbientDeclaration)

      return Array.some(ambientOrUnimported, Boolean)
    })
  )
}

export const isBareFetchCall = (checker: ts.TypeChecker) =>
  flow(Struct.get<ts.CallExpression, "expression">("expression"), isAmbientFetchCallee(checker))
