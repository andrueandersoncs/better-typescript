import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Array, Effect, Option, Order, Schema, pipe } from "effect"
import { makeNamedDetection } from "@better-typescript/core/engine/derive/makeNamedDetection"
import { runMatchers } from "@better-typescript/matchers/matcher/runMatchers"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { ProgramContext } from "@better-typescript/matchers/sources/data"
import { importUsage } from "@better-typescript/guidance/preset/architectureExploreCorePolicies"
import { moduleIdentity } from "@better-typescript/guidance/preset/architectureExploreCorePolicies"
import { exportSurface } from "@better-typescript/guidance/preset/architectureExploreCorePolicies"
import { moduleGraph } from "@better-typescript/guidance/preset/architectureExploreCorePolicies"
import { ExportSurfaceData } from "@better-typescript/matchers/builtins/exportSurface"
import { ImportUsageData } from "@better-typescript/matchers/builtins/importUsage"
import { ModuleIdentityData } from "@better-typescript/matchers/builtins/moduleIdentity"
import { architectureExploreWorkspaceImportEdges } from "@better-typescript/guidance/architectureExplore/architectureExploreGraph"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { fixturePath } from "./architectureEvidenceWorkspaceFixturePaths.js"
import { includeEverySourceFile } from "./architectureEvidenceWorkspaceIncludeEverySourceFile.js"
import { dataAs, decodeData } from "./architectureEvidenceWorkspaceDataAs.js"
import { runWorkspacePolicies } from "./architectureEvidenceWorkspaceRunPolicies.js"

test("workspace fixture discovers lib, app, and checks projects", async () => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const relativeRoots = pipe(
    workspace.projects,
    Array.map((project) =>
      path.relative(workspace.rootPath, project.rootPath).replaceAll(path.sep, "/")
    ),
    Array.sort(Order.String)
  )

  assert.deepEqual(relativeRoots, ["checks", "packages/app", "packages/lib"])
})

test("importUsage records package, relative, and test imports with call counts", async () => {
  const { detectionsByPolicy } = await runWorkspacePolicies(Array.of(importUsage))
  const importData = decodeData(Schema.is(ImportUsageData), detectionsByPolicy[0] ?? Array.empty())

  const appPackageImport = Array.findFirst(
    importData,
    (data) =>
      data.specifier === "@fixture/lib/util" &&
      data.importerWorkspacePath === "packages/app/src/main.ts"
  )

  const appRelativeImport = Array.findFirst(
    importData,
    (data) =>
      data.specifier === "./helper.js" && data.importerWorkspacePath === "packages/app/src/main.ts"
  )

  const checksTestImport = Array.findFirst(
    importData,
    (data) =>
      data.specifier === "@fixture/lib/util" && data.importerWorkspacePath === "checks/main.test.ts"
  )

  const appPackage = pipe(appPackageImport, Option.getOrThrow)
  const appRelative = pipe(appRelativeImport, Option.getOrThrow)
  const checksTest = pipe(checksTestImport, Option.getOrThrow)

  assert.equal(appPackage.fromTest, false)
  assert.equal(appRelative.fromTest, false)
  assert.equal(checksTest.fromTest, true)

  const usedByApp = Array.findFirst(appPackage.names, (entry) => entry.name === "usedByApp")
  const helper = Array.findFirst(appRelative.names, (entry) => entry.name === "helper")
  const usedOnlyByTest = Array.findFirst(
    checksTest.names,
    (entry) => entry.name === "usedOnlyByTest"
  )

  assert.equal(pipe(usedByApp, Option.getOrThrow).callCount, 1)
  assert.equal(pipe(helper, Option.getOrThrow).callCount, 1)
  assert.equal(pipe(usedOnlyByTest, Option.getOrThrow).callCount, 1)
  assert.ok(pipe(usedByApp, Option.getOrThrow).referenceCount >= 1)
})

test("moduleIdentity publishes exact and wildcard package aliases", async () => {
  const { detectionsByPolicy } = await runWorkspacePolicies(Array.of(moduleIdentity))
  const identityData = decodeData(
    Schema.is(ModuleIdentityData),
    detectionsByPolicy[0] ?? Array.empty()
  )

  const utilIdentity = Array.findFirst(
    identityData,
    (data) => data.workspacePath === "packages/lib/src/util.ts"
  )

  const extraIdentity = Array.findFirst(
    identityData,
    (data) => data.workspacePath === "packages/lib/src/extra.ts"
  )

  assert.deepEqual(pipe(utilIdentity, Option.getOrThrow).aliases, ["@fixture/lib/util"])
  assert.deepEqual(pipe(extraIdentity, Option.getOrThrow).aliases, ["@fixture/lib/extra"])
})

test("exportSurface excludes home-file refs and splits test references", async () => {
  const { detectionsByPolicy } = await runWorkspacePolicies(Array.of(exportSurface))
  const surfaceData = decodeData(
    Schema.is(ExportSurfaceData),
    detectionsByPolicy[0] ?? Array.empty()
  )

  const utilSurface = Array.findFirst(
    surfaceData,
    (data) => data.workspacePath === "packages/lib/src/util.ts"
  )

  const usedByApp = Array.findFirst(
    pipe(utilSurface, Option.getOrThrow).symbols,
    (symbol) => symbol.name === "usedByApp"
  )

  // Same-file localWrapper call is excluded by the home-file contract.
  assert.equal(pipe(usedByApp, Option.getOrThrow).kind, "function")
  assert.equal(pipe(usedByApp, Option.getOrThrow).referencingFileCount, 0)
  assert.equal(pipe(usedByApp, Option.getOrThrow).callCount, 0)

  const helperSurface = Array.findFirst(
    surfaceData,
    (data) => data.workspacePath === "packages/app/src/helper.ts"
  )

  const helper = Array.findFirst(
    pipe(helperSurface, Option.getOrThrow).symbols,
    (symbol) => symbol.name === "helper"
  )

  assert.equal(pipe(helper, Option.getOrThrow).referencingFileCount, 1)
  assert.equal(pipe(helper, Option.getOrThrow).referencingTestFileCount, 0)
  assert.equal(pipe(helper, Option.getOrThrow).callCount, 1)

  const valueSurface = Array.findFirst(
    surfaceData,
    (data) => data.workspacePath === "packages/app/src/value.ts"
  )

  const onlyTested = Array.findFirst(
    pipe(valueSurface, Option.getOrThrow).symbols,
    (symbol) => symbol.name === "onlyTested"
  )

  assert.equal(pipe(onlyTested, Option.getOrThrow).referencingFileCount, 1)
  assert.equal(pipe(onlyTested, Option.getOrThrow).referencingTestFileCount, 1)
  assert.equal(pipe(onlyTested, Option.getOrThrow).callCount, 1)
})

test("exportSurface records program-indexed evidence against the containing file", async () => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const libProject = pipe(
    workspace.projects,
    Array.findFirst(
      (project) => path.relative(workspace.rootPath, project.rootPath) === "packages/lib"
    ),
    Option.getOrThrow
  )
  const loaded = makeContext(libProject.rootPath)(libProject.program)
  const context = ProgramContext.make({
    program: loaded.program,
    checker: loaded.checker,
    projectRoot: loaded.projectRoot,
    workspaceRoot: workspace.rootPath
  })
  const matchesByPolicy = runMatchers(Array.of(exportSurface.matcher))(includeEverySourceFile)(
    context
  )
  const matches = matchesByPolicy[0] ?? Array.empty()
  const utilSurface = pipe(
    matches,
    Array.findFirst(
      (match) =>
        Schema.is(ExportSurfaceData)(match.fact) &&
        match.fact.workspacePath === "packages/lib/src/util.ts"
    ),
    Option.getOrThrow
  )

  assert.equal(utilSurface.target._tag, "FileTarget")
})

test("architectureExploreWorkspaceImportEdges joins checks test import to lib util via aliases", async () => {
  const policies = Array.make(importUsage, moduleIdentity, exportSurface, moduleGraph)
  const { detectionsByPolicy } = await runWorkspacePolicies(policies)
  const names = Array.map(policies, (named) => named.name)
  const named = Array.flatten(
    Array.map(detectionsByPolicy, (detections, policyIndex) =>
      Array.map(detections, makeNamedDetection(names[policyIndex] ?? ""))
    )
  )

  const edges = architectureExploreWorkspaceImportEdges(named)

  const joined = Array.findFirst(
    edges,
    (edge) =>
      edge.importerPath === "checks/main.test.ts" &&
      edge.importedPath === "packages/lib/src/util.ts" &&
      edge.fromTest === true &&
      Array.some(edge.names, (entry) => entry.name === "usedOnlyByTest" && entry.callCount === 1)
  )

  const edge = pipe(joined, Option.getOrThrow)
  const called = Array.findFirst(edge.names, (entry) => entry.name === "usedOnlyByTest")

  assert.equal(pipe(called, Option.getOrThrow).callCount, 1)
})
