import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import { fileCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { WideThinExportData } from "./data.js"
import { hasExportModifier } from "../support/tsNode.js"

const minimumExports = 4

const message =
  "This Module has a Wide Thin Export Surface — many exports over little implementation."

const hint =
  "Deepen one Module behind a smaller interface, or split concepts so each file earns its exports."

const isExportedStatement = (statement: ts.Statement): boolean => {
  const isExportDeclaration = ts.isExportDeclaration(statement)
  const isExportAssignment = ts.isExportAssignment(statement)
  const exportFormChecks = Array.make(isExportDeclaration, isExportAssignment)
  const isExportForm = Array.some(exportFormChecks, Boolean)

  const isVariableStatement = ts.isVariableStatement(statement)
  const isFunctionDeclaration = ts.isFunctionDeclaration(statement)
  const isClassDeclaration = ts.isClassDeclaration(statement)
  const isTypeAliasDeclaration = ts.isTypeAliasDeclaration(statement)
  const isInterfaceDeclaration = ts.isInterfaceDeclaration(statement)
  const isEnumDeclaration = ts.isEnumDeclaration(statement)

  const exportableChecks = Array.make(
    isVariableStatement,
    isFunctionDeclaration,
    isClassDeclaration,
    isTypeAliasDeclaration,
    isInterfaceDeclaration,
    isEnumDeclaration
  )

  const isExportableDeclaration = Array.some(exportableChecks, Boolean)

  const hasModifierExport =
    isExportableDeclaration && hasExportModifier(statement)

  return isExportForm || hasModifierExport
}

const wideThinElements = (context: CheckContext): ReadonlyArray<Detection> => {
  const element = detection(context)
  const sourceFile = context.sourceFile
  const statements = Array.fromIterable(sourceFile.statements)
  const exportCount = Array.filter(statements, isExportedStatement).length
  const statementCount = statements.length
  const hasMinimumExports = exportCount >= minimumExports
  const hasExportDensity = exportCount >= statementCount
  const isWideThin = hasMinimumExports && hasExportDensity

  const node = pipe(
    Option.fromNullable(statements[0]),
    Option.getOrElse(Function.constant(sourceFile))
  )

  const data = new WideThinExportData({ exportCount, statementCount })

  const reported = element({
    node,
    message,
    hint,
    data
  })

  return isWideThin ? Array.of(reported) : Array.empty()
}

export const wideThinExports: Check = fileCheck(wideThinElements)

export const wideThinExportsExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("wide-thin-exports")
