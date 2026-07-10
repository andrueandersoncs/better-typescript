import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Chunk, Effect, Stream } from "effect"
import * as ts from "typescript"
import { loadProject } from "../src/project/loadProject.js"
import type { LoadedProject } from "../src/project/loadProject.js"
import { checkableSourceFiles } from "../src/engine/sources.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturesRoot = path.join(testDirectory, "fixtures")

const fixtureNames = fs
  .readdirSync(fixturesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

const diagnosticsFormatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => fixturesRoot,
  getNewLine: () => "\n"
}

const sourceFileProblems =
  (program: ts.Program) =>
  (sourceFile: ts.SourceFile): ReadonlyArray<string> => {
    const diagnostics = [
      ...program.getSyntacticDiagnostics(sourceFile),
      ...program.getSemanticDiagnostics(sourceFile)
    ]

    return diagnostics.map((diagnostic) =>
      ts
        .formatDiagnostics([diagnostic], diagnosticsFormatHost)
        .replaceAll(fixturesRoot + path.sep, "")
        .trim()
    )
  }

const projectProblems = async (
  project: LoadedProject
): Promise<ReadonlyArray<string>> => {
  const sourceFiles = await Effect.runPromise(
    Stream.runCollect(checkableSourceFiles(project))
  )

  return Chunk.toReadonlyArray(sourceFiles).flatMap(
    sourceFileProblems(project.program)
  )
}

const registerFixtureTest = (fixtureName: string): void => {
  test(`fixture compiles: ${fixtureName}`, async () => {
    const fixturePath = path.join(fixturesRoot, fixtureName)
    const workspace = await Effect.runPromise(loadProject(fixturePath))
    const problems = (
      await Promise.all(workspace.projects.map(projectProblems))
    ).flat()

    assert.deepEqual(
      problems,
      [],
      "expected every fixture source file to compile without diagnostics"
    )
  })
}

fixtureNames.forEach(registerFixtureTest)
