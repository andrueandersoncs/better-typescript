import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import * as ts from "typescript"
import type { LoadedProject } from "@better-typescript/core/project/loadProject/data"
import { isProjectSourceFile } from "@better-typescript/core/engine/sources"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { packageExamplesRoot } from "./packageExamples.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturesRoot = path.join(testDirectory, "fixtures")

interface FixtureProject {
  readonly label: string
  readonly projectPath: string
}

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

const fixtureProjects: ReadonlyArray<FixtureProject> = fs
  .readdirSync(fixturesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    label: entry.name,
    projectPath: path.join(fixturesRoot, entry.name)
  }))
  .sort((left, right) => left.label.localeCompare(right.label))

const exampleProjects = (): ReadonlyArray<FixtureProject> => {
  if (!fs.existsSync(packageExamplesRoot)) {
    return []
  }

  const projects: Array<FixtureProject> = []

  for (const checkEntry of fs.readdirSync(packageExamplesRoot, { withFileTypes: true })) {
    if (!checkEntry.isDirectory()) {
      continue
    }

    const checkRoot = path.join(packageExamplesRoot, checkEntry.name)

    for (const pairEntry of fs.readdirSync(checkRoot, { withFileTypes: true })) {
      if (!pairEntry.isDirectory()) {
        continue
      }

      const pairRoot = path.join(checkRoot, pairEntry.name)

      for (const side of ["bad", "good"] as const) {
        const sideRoot = path.join(pairRoot, side)
        const tsconfigPath = path.join(sideRoot, "tsconfig.json")

        if (fs.existsSync(tsconfigPath)) {
          projects.push({
            label: `examples/${checkEntry.name}/${pairEntry.name}/${side}`,
            projectPath: sideRoot
          })
        }
      }
    }
  }

  return projects.sort((left, right) => left.label.localeCompare(right.label))
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

const registerFixtureTest = (fixture: FixtureProject): void => {
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

;[...fixtureProjects, ...exampleProjects()].forEach(registerFixtureTest)
