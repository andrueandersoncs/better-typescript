import { Array, Data, Function, Option, Struct, pipe, Result } from "effect"
import * as ts from "typescript"
import { symbolDeclarations } from "../../support/tsNode.js"
import { isProjectSourceFile } from "@better-typescript/matchers/sources"
import { toRelativeFileName } from "../../support/paths.js"
import { isTestSourceFile } from "./paths.js"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"

// ModuleEdge is the shared normalized import edge because graph matchers need it.
export class ModuleEdge extends Data.Class<{
  readonly importerPath: string
  readonly importedPath: string
  readonly fromTest: boolean
}> {}

const moduleSourceFile =
  (context: ProgramContext, containingFile: ts.SourceFile) => (moduleSpecifier: ts.Expression) => {
    const declarationsOf = Function.flow(
      symbolDeclarations,
      Option.fromNullishOr,
      Option.getOrElse((): ReadonlyArray<ts.Declaration> => Array.empty())
    )

    const checkerSource = pipe(
      context.checker.getSymbolAtLocation(moduleSpecifier),
      Option.fromNullishOr,
      Option.map(declarationsOf),
      Option.flatMap(Array.findFirst(ts.isSourceFile))
    )

    if (Option.isSome(checkerSource)) {
      return checkerSource
    }

    const specifier = pipe(
      Option.liftPredicate(ts.isStringLiteralLike)(moduleSpecifier),
      Option.map(Struct.get("text"))
    )

    const compilerOptions = context.program.getCompilerOptions()

    const resolveModule = (text: string) => {
      const resolution = ts.resolveModuleName(
        text,
        containingFile.fileName,
        compilerOptions,
        ts.sys
      )

      return Option.fromNullishOr(resolution.resolvedModule)
    }

    const sourceFileForResolved = (resolved: ts.ResolvedModule) =>
      pipe(context.program.getSourceFile(resolved.resolvedFileName), Option.fromNullishOr)

    return pipe(specifier, Option.flatMap(resolveModule), Option.flatMap(sourceFileForResolved))
  }

const statementModuleSpecifier = (statement: ts.Statement) => {
  if (ts.isImportDeclaration(statement)) {
    return Option.some(statement.moduleSpecifier)
  }

  const moduleSpecifierOf = (declaration: ts.ExportDeclaration) =>
    pipe(declaration.moduleSpecifier, Option.fromNullishOr)

  return pipe(
    Option.liftPredicate(ts.isExportDeclaration)(statement),
    Option.flatMap(moduleSpecifierOf)
  )
}

export const buildModuleEdges = (context: ProgramContext): ReadonlyArray<ModuleEdge> => {
  const relative = toRelativeFileName(context.projectRoot)
  const classifyTestSource = isTestSourceFile(context.workspaceRoot)
  const projectFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))

  const edgesForSourceFile = (sourceFile: ts.SourceFile) => {
    const importerPath = relative(sourceFile.fileName)
    const fromTest = classifyTestSource(sourceFile)

    const edgeForStatement = (statement: ts.Statement) => {
      const makeModuleEdgeForImportedFile = (importedFile: ts.SourceFile) => {
        const importedPath = relative(importedFile.fileName)

        return new ModuleEdge({
          importerPath,
          importedPath,
          fromTest
        })
      }

      return pipe(
        statementModuleSpecifier(statement),
        Option.flatMap(moduleSourceFile(context, sourceFile)),
        Option.filter(isProjectSourceFile),
        Option.map(makeModuleEdgeForImportedFile),
        Result.fromOption(Function.constVoid)
      )
    }

    return Array.filterMap(sourceFile.statements, edgeForStatement)
  }

  return Array.flatMap(projectFiles, edgesForSourceFile)
}
