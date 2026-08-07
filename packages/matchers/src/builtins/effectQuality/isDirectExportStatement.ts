import { Array, Option, pipe } from "effect"

import * as ts from "typescript"

import { hasExportModifier } from "../../support/hasExportModifier.js"

import { ancestorMatching } from "./ancestorMatching.js"

const isDirectExportStatement = (node: ts.Node): node is ts.Statement => {
  const variableStatement = ts.isVariableStatement(node)
  const functionDeclaration = ts.isFunctionDeclaration(node)
  const classDeclaration = ts.isClassDeclaration(node)
  const interfaceDeclaration = ts.isInterfaceDeclaration(node)
  const typeAliasDeclaration = ts.isTypeAliasDeclaration(node)

  const kinds = Array.make(
    variableStatement,
    functionDeclaration,
    classDeclaration,
    interfaceDeclaration,
    typeAliasDeclaration
  )

  return Array.some(kinds, Boolean)
}

export const isExportedDeclaration = (node: ts.Node) =>
  isDirectExportStatement(node)
    ? hasExportModifier(node)
    : pipe(ancestorMatching(ts.isVariableStatement)(node), Option.exists(hasExportModifier))
