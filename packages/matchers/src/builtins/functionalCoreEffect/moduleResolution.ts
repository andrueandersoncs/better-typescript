import { Array, Function, Match, Option, Struct, pipe } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import type { FunctionalCoreEffectPolicy } from "./policy.js"
import { declarationsOfSymbol } from "./importedMembers.js"

export const resolvedModuleSourceFile = (
  context: MatchContext,
  declaration: ts.ImportDeclaration | ts.ExportDeclaration
) => {
  const moduleSpecifier = declaration.moduleSpecifier

  const findFirstOf = (declarations: ReadonlyArray<ts.Declaration>) =>
    Array.findFirst(declarations, ts.isSourceFile)

  const pipeOf4 = (specifier: ts.Node) =>
    pipe(
      context.checker.getSymbolAtLocation(specifier),
      Option.fromNullishOr,
      Option.map(declarationsOfSymbol),
      Option.flatMap(findFirstOf)
    )

  const checkerSource = pipe(Option.fromNullishOr(moduleSpecifier), Option.flatMap(pipeOf4))

  if (Option.isSome(checkerSource)) {
    return checkerSource
  }

  const specifier = pipe(
    Option.fromNullishOr(moduleSpecifier),
    Option.filter(ts.isStringLiteralLike),
    Option.map(Struct.get("text"))
  )

  const pipeOf5 = (resolved: ts.ResolvedModuleFull) =>
    pipe(context.program.getSourceFile(resolved.resolvedFileName), Option.fromNullishOr)

  return pipe(
    specifier,
    Option.flatMap((text) => {
      const compilerOptions = context.program.getCompilerOptions()

      const resolution = ts.resolveModuleName(
        text,
        context.sourceFile.fileName,
        compilerOptions,
        ts.sys
      )

      return Option.fromNullishOr(resolution.resolvedModule)
    }),
    Option.flatMap(pipeOf5)
  )
}

export const moduleMatchesPolicyPrefix = (
  policy: FunctionalCoreEffectPolicy,
  moduleSpecifier: string
) =>
  Array.some(policy.capabilityModulePrefixes, (prefix) => {
    const namespacePrefix = prefix.endsWith(":")
    const namespaceMatch = namespacePrefix && moduleSpecifier.startsWith(prefix)
    const packagePrefix = `${prefix}/`
    const exactPackage = strictEqual(prefix)(moduleSpecifier)
    const nestedPackage = moduleSpecifier.startsWith(packagePrefix)
    const packageMatch = exactPackage || nestedPackage
    const matchFlags = Array.make(namespaceMatch, packageMatch)

    return Array.some(matchFlags, Boolean)
  })

const namedImportsHaveRuntimeValue = (bindings: ts.NamedImports) =>
  Array.some(bindings.elements, (specifier) => !specifier.isTypeOnly)

export const importHasRuntimeValue = (declaration: ts.ImportDeclaration) =>
  pipe(
    Option.fromNullishOr(declaration.importClause),
    Option.match({
      onNone: Function.constTrue,
      onSome: (clause) => {
        const isValueImport = !clause.isTypeOnly
        const defaultName = Option.fromNullishOr(clause.name)
        const hasDefaultName = Option.isSome(defaultName)

        const hasNamedRuntime = pipe(
          Option.fromNullishOr(clause.namedBindings),
          Option.match({
            onNone: Function.constTrue,
            onSome: (bindings) =>
              pipe(
                Match.value(bindings),
                Match.when(ts.isNamespaceImport, Function.constTrue),
                Match.when(ts.isNamedImports, namedImportsHaveRuntimeValue),
                Match.exhaustive
              )
          })
        )

        const hasRuntimeBinding = hasDefaultName || hasNamedRuntime
        const matchFlags = Array.make(isValueImport, hasRuntimeBinding)

        return Array.every(matchFlags, Boolean)
      }
    })
  )
