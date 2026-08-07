import { Array, Option, flow, pipe } from "effect"
import * as ts from "typescript"
import { declarationsOfSymbol } from "./declarationsOfSymbol.js"

const isEffectManagedRuntimeSource = (sourceFile: ts.SourceFile) => {
  const normalized = sourceFile.fileName.replaceAll("\\", "/")

  const installed =
    normalized.includes("/node_modules/effect/") && normalized.endsWith("/ManagedRuntime.d.ts")

  const vendored = normalized.endsWith("/packages/effect/src/ManagedRuntime.ts")

  return installed || vendored
}

const declarationSourceFile = (declaration: ts.Declaration) => declaration.getSourceFile()
const declarationFromManagedRuntime = flow(declarationSourceFile, isEffectManagedRuntimeSource)

const someManagedRuntimeSource = (declarations: ReadonlyArray<ts.Declaration>) =>
  Array.some(declarations, declarationFromManagedRuntime)

export const isManagedRuntimeMethodAccess = (
  checker: ts.TypeChecker,
  node: ts.PropertyAccessExpression,
  names: ReadonlyArray<string>
) => {
  const nameMatches = Array.contains(names, node.name.text)

  const managedRuntime = pipe(
    node.name,
    (nameNode) => checker.getSymbolAtLocation(nameNode),
    Option.fromNullishOr,
    Option.map(declarationsOfSymbol),
    Option.exists(someManagedRuntimeSource)
  )

  const matchFlags = Array.make(nameMatches, managedRuntime)

  return Array.every(matchFlags, Boolean)
}
