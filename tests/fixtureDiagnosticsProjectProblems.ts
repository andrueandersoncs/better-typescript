import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Effect } from "effect"
import * as ts from "typescript"
import type { LoadedProject } from "@better-typescript/core/project/loadProject/loadedProject"
import { isProjectSourceFile } from "@better-typescript/matchers/sources/isProjectSourceFile"
import { loadProject } from "@better-typescript/core/project/loadProject"
import type { FixtureProject } from "./fixtureDiagnosticsFixtureProject.js"

// Ignore noUnused diagnostics because fixtures intentionally isolate unused syntax patterns.
const analysisOnlyDiagnosticCodes: Readonly<Record<number, true>> = {
  6133: true,
  6138: true,
  6192: true,
  6196: true,
  6198: true,
  6199: true,
  6205: true
}

const diagnosticsFormatHost = (projectRoot: string): ts.FormatDiagnosticsHost => ({
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => projectRoot,
  getNewLine: () => "\n"
})

const sourceFileProblems =
  (program: ts.Program) =>
  (projectRoot: string) =>
  (sourceFile: ts.SourceFile): ReadonlyArray<string> => {
    const diagnostics = [
      ...program.getSyntacticDiagnostics(sourceFile),
      ...program.getSemanticDiagnostics(sourceFile)
    ].filter((diagnostic) => !(diagnostic.code in analysisOnlyDiagnosticCodes))

    return diagnostics.map((diagnostic) =>
      ts
        .formatDiagnostics([diagnostic], diagnosticsFormatHost(projectRoot))
        .replaceAll(projectRoot + path.sep, "")
        .trim()
    )
  }

const projectProblems = (project: LoadedProject, projectRoot: string): ReadonlyArray<string> => {
  const sourceFiles = project.program.getSourceFiles().filter(isProjectSourceFile)

  return sourceFiles.flatMap(sourceFileProblems(project.program)(projectRoot))
}

export const registerFixtureTest = (fixture: FixtureProject): void => {
  test(`fixture compiles: ${fixture.label}`, async () => {
    const workspace = await Effect.runPromise(loadProject(fixture.projectPath))
    const problems = (
      await Promise.all(
        workspace.projects.map((project) => projectProblems(project, fixture.projectPath))
      )
    ).flat()

    assert.deepEqual(
      problems,
      [],
      "expected every fixture source file to compile without diagnostics"
    )
  })
}
