import { Array, Function, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { fileCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"
import { fixtureRefactorExamples } from "../../fixtureExamples.js"
import { ImportCallGraphData } from "./data.js"
import { foldAst } from "@better-typescript/core/engine/sources"

const minimumImports = 2

const message =
  "This Module participates in an Import Call Graph worth measuring for Architecture Explore Advice."

const hint =
  "Use this silent evidence with shallowness and bounce Advice — do not treat the edge count as a local style nit."

const moduleSpecifierText = (
  statement: ts.ImportDeclaration
): Option.Option<string> =>
  pipe(
    Option.fromNullable(statement.moduleSpecifier),
    Option.filter(ts.isStringLiteral),
    Option.map(Struct.get("text"))
  )

const countCallExpression = (count: number, node: ts.Node): number =>
  ts.isCallExpression(node) ? count + 1 : count

const importCallGraphElements = (
  context: CheckContext
): ReadonlyArray<Detection> => {
  const element = detection(context)
  const sourceFile = context.sourceFile
  const statements = Array.fromIterable(sourceFile.statements)

  const importDeclarations = Array.filter(statements, ts.isImportDeclaration)

  const importedPaths = pipe(
    importDeclarations,
    Array.filterMap(moduleSpecifierText)
  )

  const outgoingCallCount = foldAst(countCallExpression)(sourceFile)(0)

  const importCount = importedPaths.length
  const isActiveGraph = importCount >= minimumImports

  const node = pipe(
    Option.fromNullable(importDeclarations[0]),
    Option.getOrElse(Function.constant(sourceFile))
  )

  const data = new ImportCallGraphData({
    importCount,
    outgoingCallCount,
    importedPaths
  })

  const reported = element({
    node,
    message,
    hint,
    data
  })

  return isActiveGraph ? Array.of(reported) : Array.empty()
}

export const importCallGraph: Check = fileCheck(importCallGraphElements)

export const importCallGraphExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("import-call-graph")
