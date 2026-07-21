import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, pipe } from "effect"
import * as ts from "typescript"
import { noUnused } from "@better-typescript/guidance/policies/noUnused"
import { compilerOptionsForPolicies, toPolicies } from "@better-typescript/core/engine/policy"
import { workspacePrograms } from "@better-typescript/core/engine/workspacePrograms"
import { discoverWorkspace, loadProject } from "@better-typescript/core/project/loadProject"
import type { WorkspaceConfigs } from "@better-typescript/core/project/loadProject/data"
import { makeContext, isProjectSourceFile } from "@better-typescript/matchers/sources"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const noUnusedFixturePath = path.join(testDirectory, "fixtures", "no-unused")

const includeEverySourceFile = () => true
const noUnusedCompilerOptions = compilerOptionsForPolicies([noUnused])

const collectPrograms = (workspace: WorkspaceConfigs, compilerOptions: ts.CompilerOptions = {}) =>
  Effect.scoped(workspacePrograms.materialize(workspace, compilerOptions))

const detectionIdentity = (detection: {
  readonly location: { readonly path: string; readonly line: number; readonly column: number }
  readonly message: string
}): string =>
  `${detection.location.path}:${detection.location.line}:${detection.location.column}:${detection.message}`

const sortIdentities = (identities: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...identities].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))

const writeCompatibleProjects = async (root: string): Promise<void> => {
  const sharedTsconfig = {
    compilerOptions: {
      strict: true,
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      lib: ["ES2022"]
    },
    include: ["src/**/*.ts"]
  }

  for (const projectName of ["alpha", "beta"]) {
    const projectRoot = path.join(root, projectName)
    await fs.mkdir(path.join(projectRoot, "src"), { recursive: true })
    await fs.writeFile(
      path.join(projectRoot, "tsconfig.json"),
      `${JSON.stringify(sharedTsconfig, null, 2)}\n`
    )
    await fs.writeFile(
      path.join(projectRoot, "src", "index.ts"),
      `export const ${projectName}Value = 1\n`
    )
  }

  await fs.writeFile(
    path.join(root, "tsconfig.json"),
    `${JSON.stringify(
      {
        files: [],
        references: [{ path: "alpha" }, { path: "beta" }]
      },
      null,
      2
    )}\n`
  )
}

test("workspacePrograms emits exactly one workspace update", async () => {
  const workspace = await Effect.runPromise(discoverWorkspace(noUnusedFixturePath))
  const update = await Effect.runPromise(collectPrograms(workspace))

  assert.equal(update.rootPath, workspace.rootPath)
  assert.equal(update.contexts.length, workspace.projects.length)
})

test("loadProject preserves configured compiler options when no Matcher requires more", async () => {
  const loaded = await Effect.runPromise(loadProject(noUnusedFixturePath))
  const options = loaded.projects[0]?.program.getCompilerOptions()

  assert.notEqual(options?.noUnusedLocals, true)
  assert.notEqual(options?.noUnusedParameters, true)
})

test("workspacePrograms creates fresh Programs on each subscription", async () => {
  const workspace = await Effect.runPromise(discoverWorkspace(noUnusedFixturePath))
  const first = await Effect.runPromise(collectPrograms(workspace))
  const second = await Effect.runPromise(collectPrograms(workspace))

  assert.equal(first.contexts.length, second.contexts.length)
  assert.notEqual(first.contexts[0]?.program, second.contexts[0]?.program)
})

test("workspacePrograms shares library SourceFile identities for compatible option buckets", async () => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "workspace-programs-share-"))

  try {
    await writeCompatibleProjects(tempDirectory)

    const workspace = await Effect.runPromise(discoverWorkspace(tempDirectory))
    const update = await Effect.runPromise(collectPrograms(workspace))

    assert.equal(update.contexts.length, 2)

    const firstLibraries = update.contexts[0]!.program.getSourceFiles().filter((sourceFile) =>
      sourceFile.fileName.includes(`${path.sep}typescript${path.sep}lib${path.sep}`)
    )
    const secondLibraries = update.contexts[1]!.program.getSourceFiles().filter((sourceFile) =>
      sourceFile.fileName.includes(`${path.sep}typescript${path.sep}lib${path.sep}`)
    )

    assert.ok(firstLibraries.length > 0, "expected library SourceFiles")

    const shared = firstLibraries.filter((sourceFile) =>
      secondLibraries.some((candidate) => candidate === sourceFile)
    )

    assert.ok(
      shared.length > 0,
      "expected shared library SourceFile object identity across compatible projects"
    )
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true })
  }
})

test("workspacePrograms preserves no-unused fixture diagnostics with primary program options", async () => {
  const workspace = await Effect.runPromise(discoverWorkspace(noUnusedFixturePath))
  const update = await Effect.runPromise(collectPrograms(workspace, noUnusedCompilerOptions))
  const context = update.contexts[0]

  assert.ok(context, "expected one project context for the no-unused fixture")

  const options = context.program.getCompilerOptions()

  assert.equal(options.noUnusedLocals, true)
  assert.equal(options.noUnusedParameters, true)
  assert.equal(options.noEmit, true)

  const detections = toPolicies([noUnused])(includeEverySourceFile)(context)[0] ?? []
  const identities = sortIdentities(detections.map(detectionIdentity))

  assert.deepEqual(identities, [
    "src/cases.ts:1:18:Avoid unused imports, declarations, and parameters.",
    "src/cases.ts:2:1:Avoid unused imports, declarations, and parameters.",
    "src/cases.ts:4:7:Avoid unused imports, declarations, and parameters.",
    "src/cases.ts:6:7:Avoid unused imports, declarations, and parameters.",
    "src/cases.ts:8:6:Avoid unused imports, declarations, and parameters.",
    "src/cases.ts:10:41:Avoid unused imports, declarations, and parameters."
  ])
})

test("loadProject and workspacePrograms agree on no-unused detections", async () => {
  const [loaded, oneShot] = await Promise.all([
    Effect.runPromise(loadProject(noUnusedFixturePath, noUnusedCompilerOptions)),
    Effect.runPromise(
      pipe(
        discoverWorkspace(noUnusedFixturePath),
        Effect.flatMap((workspace) => collectPrograms(workspace, noUnusedCompilerOptions))
      )
    )
  ])

  const loadedContext = makeContext(loaded.projects[0]!.rootPath)(loaded.projects[0]!.program)
  const oneShotContext = oneShot.contexts[0]!

  const loadedDetections = toPolicies([noUnused])(includeEverySourceFile)(loadedContext)[0] ?? []
  const oneShotDetections = toPolicies([noUnused])(includeEverySourceFile)(oneShotContext)[0] ?? []

  assert.deepEqual(
    sortIdentities(loadedDetections.map(detectionIdentity)),
    sortIdentities(oneShotDetections.map(detectionIdentity))
  )
})

test("analysis programs use ParseForTypeErrors JSDoc mode", async () => {
  const [workspace, loaded] = await Promise.all([
    Effect.runPromise(discoverWorkspace(noUnusedFixturePath)),
    Effect.runPromise(loadProject(noUnusedFixturePath))
  ])
  const sourceFiles = loaded.projects[0]!.program.getSourceFiles().filter(isProjectSourceFile)

  assert.ok(sourceFiles.length > 0)

  for (const sourceFile of sourceFiles) {
    const mode = (sourceFile as ts.SourceFile & { readonly jsDocParsingMode?: ts.JSDocParsingMode })
      .jsDocParsingMode

    assert.equal(mode, ts.JSDocParsingMode.ParseForTypeErrors)
  }

  const oneShot = await Effect.runPromise(collectPrograms(workspace))
  const oneShotFiles = oneShot.contexts[0]!.program.getSourceFiles().filter(isProjectSourceFile)

  for (const sourceFile of oneShotFiles) {
    const mode = (sourceFile as ts.SourceFile & { readonly jsDocParsingMode?: ts.JSDocParsingMode })
      .jsDocParsingMode

    assert.equal(mode, ts.JSDocParsingMode.ParseForTypeErrors)
  }
})
