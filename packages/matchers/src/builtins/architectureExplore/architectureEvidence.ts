import { Array, Function, MutableRef, Option, Result, Struct, pipe, flow } from "effect"
import { strictEqual } from "@better-typescript/matchers/equivalence"
import * as ts from "typescript"
import type { ProgramContext } from "../../sources/data.js"
import { isProjectSourceFile } from "../../sources/isProjectSourceFile.js"
import { toRelativeFileName } from "../../support/paths.js"
import { symbolDeclarations } from "../../support/symbolDeclarations.js"
import { ModuleEdge } from "./moduleEdge.js"
import { ArchitectureEvidence } from "./architectureEvidenceType.js"
import { CachedArchitectureEvidence } from "./cachedArchitectureEvidence.js"
import { ExportReferenceIndex } from "./exportReferenceIndex.js"
import { isTestSourceFile } from "./isTestPath.js"
import { ExportedFunctionEntry } from "./exportedFunctionEntry.js"
import { functionInitializer } from "../../support/functionInitializer2.js"
import { hasExportModifier } from "../../support/hasExportModifier.js"
import { resolvedSymbolAt } from "../../support/resolvedSymbolAt.js"
import { buildUsageMap } from "./programSymbols.js"

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

const buildModuleEdges = (context: ProgramContext): ReadonlyArray<ModuleEdge> => {
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

const variableFunctionEntries =
  (checker: ts.TypeChecker) =>
  (statement: ts.VariableStatement): ReadonlyArray<ExportedFunctionEntry> => {
    if (!hasExportModifier(statement)) {
      return Array.empty()
    }

    const entryForDeclaration = (declaration: ts.VariableDeclaration) => {
      const entryForFunction = (
        functionNode: ts.ArrowFunction | ts.FunctionExpression | ts.FunctionDeclaration
      ) => {
        const entryForName = (nameNode: ts.Identifier) => {
          const makeExportedFunctionEntry = (symbol: ts.Symbol) =>
            new ExportedFunctionEntry({
              symbol,
              nameNode,
              declarationNode: declaration,
              functionNode
            })

          return pipe(resolvedSymbolAt(checker)(nameNode), Option.map(makeExportedFunctionEntry))
        }

        return pipe(
          Option.liftPredicate(ts.isIdentifier)(declaration.name),
          Option.flatMap(entryForName)
        )
      }

      return pipe(
        functionInitializer(declaration),
        Option.flatMap(entryForFunction),
        Result.fromOption(Function.constVoid)
      )
    }

    return Array.filterMap(statement.declarationList.declarations, entryForDeclaration)
  }

const functionDeclarationEntry =
  (checker: ts.TypeChecker) =>
  (declaration: ts.FunctionDeclaration): Option.Option<ExportedFunctionEntry> => {
    if (!hasExportModifier(declaration)) {
      return Option.none()
    }

    const entryForName = (nameNode: ts.Identifier) => {
      const makeExportedFunctionEntry = (symbol: ts.Symbol) =>
        new ExportedFunctionEntry({
          symbol,
          nameNode,
          declarationNode: declaration,
          functionNode: declaration
        })

      return pipe(resolvedSymbolAt(checker)(nameNode), Option.map(makeExportedFunctionEntry))
    }

    return pipe(Option.fromNullishOr(declaration.name), Option.flatMap(entryForName))
  }

const exportedFunctionsIn =
  (checker: ts.TypeChecker) =>
  (sourceFile: ts.SourceFile): ReadonlyArray<ExportedFunctionEntry> =>
    Array.flatMap(sourceFile.statements, (statement) => {
      if (ts.isVariableStatement(statement)) {
        return variableFunctionEntries(checker)(statement)
      }

      return pipe(
        Option.liftPredicate(ts.isFunctionDeclaration)(statement),
        Option.flatMap(functionDeclarationEntry(checker)),
        Option.toArray
      )
    })

const isInsideDeclaration = (declaration: ts.Declaration) => (node: ts.Identifier) => {
  const nodeSourceFile = node.getSourceFile()
  const declarationSourceFile = declaration.getSourceFile()
  const sameFile = strictEqual(declarationSourceFile)(nodeSourceFile)
  const afterStart = node.pos >= declaration.pos
  const beforeEnd = node.end <= declaration.end
  const checks = Array.make(sameFile, afterStart, beforeEnd)

  return Array.every(checks, Boolean)
}

const isOutsideDeclaration = (declaration: ts.Declaration) => (node: ts.Identifier) => {
  const insideDeclaration = isInsideDeclaration(declaration)(node)

  return !insideDeclaration
}

const referenceOutsideDeclaration = (entry: ExportedFunctionEntry) =>
  isOutsideDeclaration(entry.declarationNode)

const buildExportReferenceIndex = (context: ProgramContext) => {
  const projectFiles = pipe(context.program.getSourceFiles(), Array.filter(isProjectSourceFile))
  const entries = Array.flatMap(projectFiles, exportedFunctionsIn(context.checker))
  const usages = buildUsageMap(context)(entries, referenceOutsideDeclaration)

  return new ExportReferenceIndex({ entries, usages })
}

const emptyEvidenceCache = Option.none<CachedArchitectureEvidence>()
const evidenceCache = MutableRef.make(emptyEvidenceCache)

const buildArchitectureEvidence = (context: ProgramContext) => {
  const exportReferenceIndex = buildExportReferenceIndex(context)
  const moduleEdges = buildModuleEdges(context)

  return new ArchitectureEvidence({ exportReferenceIndex, moduleEdges })
}

export const architectureEvidence = (context: ProgramContext) => {
  const cached = MutableRef.get(evidenceCache)

  const matchesProgram = flow(
    Struct.get<CachedArchitectureEvidence, "program">("program"),
    strictEqual(context.program)
  )

  const current = pipe(cached, Option.filter(matchesProgram))

  if (Option.isSome(current)) {
    return current.value.evidence
  }

  const evidence = buildArchitectureEvidence(context)
  const entry = new CachedArchitectureEvidence({ program: context.program, evidence })
  const updated = Option.some(entry)

  MutableRef.set(evidenceCache, updated)

  return evidence
}
