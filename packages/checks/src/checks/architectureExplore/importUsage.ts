import { Array, Match, Option, Struct, Tuple, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { foldAst } from "@better-typescript/core/engine/sources"
import { toRelativeFileName } from "@better-typescript/core/engine/location"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

import { ImportUsageData, ImportedNameUsage } from "./data.js"
import { importElements, isTestSourceFile, toWorkspacePath } from "./programSymbols.js"

const message = "Import usage evidence — this import declaration binds names used in the file."

const hint =
  "Counts are purely syntactic within the importing file; local shadowing of an import binding can inflate or hide references."

const isInsideNode =
  (container: ts.Node) =>
  (node: ts.Node): boolean => {
    const sameFile = node.getSourceFile() === container.getSourceFile()
    const afterStart = node.pos >= container.pos
    const beforeEnd = node.end <= container.end
    const conditions = Array.make(sameFile, afterStart, beforeEnd)

    return Array.every(conditions, Boolean)
  }

const isNamedCallReference = (node: ts.Identifier): boolean =>
  pipe(
    Option.liftPredicate(ts.isCallExpression)(node.parent),
    Option.exists((call) => call.expression === node)
  )

const isNamespaceCallReference = (node: ts.Identifier): boolean => {
  const namedCall = isNamedCallReference(node)

  const namespaceCall = pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(node.parent),
    Option.exists((access) => {
      const isObject = access.expression === node

      const invokesAccess = pipe(
        Option.liftPredicate(ts.isCallExpression)(access.parent),
        Option.exists((call) => call.expression === access)
      )

      const conditions = Array.make(isObject, invokesAccess)
      return Array.every(conditions, Boolean)
    })
  )

  const callKinds = Array.make(namedCall, namespaceCall)
  return Array.some(callKinds, Boolean)
}

const countBinding =
  (sourceFile: ts.SourceFile, importDeclaration: ts.ImportDeclaration) =>
  (binding: ts.Identifier): ImportedNameUsage => {
    const insideImport = isInsideNode(importDeclaration)
    const isNamespace = ts.isNamespaceImport(binding.parent)
    const isCallReference = isNamespace ? isNamespaceCallReference : isNamedCallReference
    const bindingName = binding.text
    const initialCount = Tuple.make(0, 0)

    const counted = foldAst(
      (current: readonly [number, number], node: ts.Node): readonly [number, number] => {
        const candidate = pipe(
          Option.liftPredicate(ts.isIdentifier)(node),
          Option.filter((identifier) => identifier.text === bindingName),
          Option.filter((identifier) => !insideImport(identifier))
        )

        if (Option.isNone(candidate)) {
          return current
        }

        const [referenceCount, callCount] = current
        const callIncrement = isCallReference(candidate.value) ? 1 : 0

        return Tuple.make(referenceCount + 1, callCount + callIncrement)
      }
    )(sourceFile)(initialCount)

    const [referenceCount, callCount] = counted

    return new ImportedNameUsage({
      name: bindingName,
      referenceCount,
      callCount
    })
  }

const importBindings = (node: ts.ImportDeclaration): ReadonlyArray<ts.Identifier> => {
  const clause = Option.fromNullishOr(node.importClause)

  if (Option.isNone(clause)) {
    return Array.empty()
  }

  const defaultBinding = pipe(Option.fromNullishOr(clause.value.name), Option.toArray)

  const namedBindings = pipe(
    Option.fromNullishOr(clause.value.namedBindings),
    Option.map((bindings) =>
      pipe(
        Match.value(bindings),
        Match.when(ts.isNamespaceImport, (namespaceImport) => Array.of(namespaceImport.name)),
        Match.when(ts.isNamedImports, (namedImports) =>
          Array.map(namedImports.elements, Struct.get("name"))
        ),
        Match.exhaustive
      )
    ),
    Option.getOrElse(Array.empty)
  )

  return Array.appendAll(defaultBinding, namedBindings)
}

const importUsageElement = (context: CheckContext) => {
  const element = detection(context)
  const relative = toRelativeFileName(context.projectRoot)
  const workspaceRelative = toWorkspacePath(context.projectRoot, context.workspaceRoot)
  const fromTest = isTestSourceFile(context.projectRoot)(context.sourceFile)
  const relativePath = relative(context.sourceFile.fileName)
  const importerWorkspacePath = workspaceRelative(relativePath)

  const elementForImport =
    (node: ts.ImportDeclaration) =>
    (specifier: string): Option.Option<Detection> => {
      const bindings = importBindings(node)
      const bindingUsage = countBinding(context.sourceFile, node)
      const names = Array.map(bindings, bindingUsage)

      const data = new ImportUsageData({
        specifier,
        importerWorkspacePath,
        fromTest,
        names
      })

      const reported = element({ node, message, hint, data })
      return Option.some(reported)
    }

  return elementForImport
}

const importUsageElements = importElements(importUsageElement)

const importDeclarationKinds = Array.of(ts.SyntaxKind.ImportDeclaration)

export const importUsage: Check = nodeCheck(importDeclarationKinds)(ts.isImportDeclaration)(
  importUsageElements
)
