import * as assert from "node:assert/strict"
import * as path from "node:path"
import * as ts from "typescript"
import { semanticModuleEngine } from "@better-typescript/matchers/builtins/architectureExplore/semanticModuleEngine"
import { emptySemanticModuleHardBondRuleCatalog } from "@better-typescript/matchers/builtins/architectureExplore/emptySemanticModuleHardBondRuleCatalog"
import { ProgramMatchContext } from "@better-typescript/matchers/matcher/programMatchContext"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { testDirectory } from "./semanticModulesTestDirectory.js"

export const parserRecoverySnapshot = () => {
  const sourceText = "function () {}\n"
  const projectRoot = path.join(testDirectory, "parser-recovery")
  const fileName = path.join(projectRoot, "broken.ts")
  const compilerOptions: ts.CompilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noEmit: true
  }
  const baseHost = ts.createCompilerHost(compilerOptions)
  const host: ts.CompilerHost = {
    ...baseHost,
    fileExists: (requestedFileName) =>
      requestedFileName === fileName || baseHost.fileExists(requestedFileName),
    readFile: (requestedFileName) =>
      requestedFileName === fileName ? sourceText : baseHost.readFile(requestedFileName),
    getSourceFile: (requestedFileName, languageVersion, onError, shouldCreateNewSourceFile) =>
      requestedFileName === fileName
        ? ts.createSourceFile(requestedFileName, sourceText, languageVersion, true)
        : baseHost.getSourceFile(
            requestedFileName,
            languageVersion,
            onError,
            shouldCreateNewSourceFile
          )
  }
  const program = ts.createProgram([fileName], compilerOptions, host)
  const sourceFile = program.getSourceFile(fileName)

  assert.ok(sourceFile !== undefined)

  const context = makeContext(projectRoot)(program)
  const planningContext = ProgramMatchContext.make({ ...context, sourceFiles: [sourceFile] })

  return {
    diagnostics: program.getSyntacticDiagnostics(sourceFile),
    snapshot: semanticModuleEngine.buildSemanticModuleSnapshot(
      planningContext,
      emptySemanticModuleHardBondRuleCatalog
    )
  }
}
