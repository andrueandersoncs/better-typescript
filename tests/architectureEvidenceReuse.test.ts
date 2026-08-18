import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array, Effect, Option, Schema, pipe } from "effect"
import { architectureEvidence } from "@better-typescript/matchers/builtins/architectureExplore/architectureEvidence"
import { importUsage } from "@better-typescript/guidance/preset/architectureExploreCorePolicies"
import { moduleGraph } from "@better-typescript/guidance/preset/architectureExploreCorePolicies"
import { passThroughWrappers } from "@better-typescript/guidance/preset/architectureExploreCorePolicies"
import { testOnlyExports } from "@better-typescript/guidance/preset/architectureExploreCorePolicies"
import { compositionForwarders } from "@better-typescript/guidance/preset/compositionForwarders"
import { ImportUsageData } from "@better-typescript/matchers/builtins/importUsage"
import { ModuleGraphData } from "@better-typescript/matchers/builtins/moduleGraph"
import { PassThroughWrapperData } from "@better-typescript/matchers/builtins/passThroughWrappers"
import { TestOnlyExportData } from "@better-typescript/matchers/builtins/testOnlyExports"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { evidenceFixturePath } from "./architectureEvidenceReuseEvidenceFixturePath.js"
import { importUsageFixturePath } from "./architectureEvidenceReuseImportUsageFixturePath.js"
import { runPoliciesOnFixture } from "./architectureEvidenceReusePoliciesOnFixture.js"
import { runFixture } from "./architectureEvidenceReuseRunFixture.js"
import { dataAs } from "./architectureEvidenceReuseDataAs.js"
import { detectionSnapshot } from "./architectureEvidenceReuseDetectionSnapshot.js"

test("architecture evidence reuses facets within one Program and rebuilds for a new Program", async () => {
  const workspace = await Effect.runPromise(loadProject(evidenceFixturePath))
  const firstProject = workspace.projects[0]
  assert.ok(firstProject !== undefined)

  const firstContext = makeContext(firstProject.rootPath)(firstProject.program)

  const firstExportIndex = architectureEvidence(firstContext).exportReferenceIndex
  const secondExportIndex = architectureEvidence(firstContext).exportReferenceIndex
  const firstSurfaceIndex = architectureEvidence(firstContext).exportSymbolIndex
  const secondSurfaceIndex = architectureEvidence(firstContext).exportSymbolIndex
  const firstEdges = architectureEvidence(firstContext).moduleEdges
  const secondEdges = architectureEvidence(firstContext).moduleEdges

  assert.equal(firstExportIndex, secondExportIndex)
  assert.ok(firstSurfaceIndex !== undefined)
  assert.equal(firstSurfaceIndex, secondSurfaceIndex)
  assert.equal(firstEdges, secondEdges)

  const secondWorkspace = await Effect.runPromise(loadProject(evidenceFixturePath))
  const secondProject = secondWorkspace.projects[0]
  assert.ok(secondProject !== undefined)
  const secondContext = makeContext(secondProject.rootPath)(secondProject.program)

  const rebuiltExportIndex = architectureEvidence(secondContext).exportReferenceIndex
  const rebuiltSurfaceIndex = architectureEvidence(secondContext).exportSymbolIndex
  const rebuiltEdges = architectureEvidence(secondContext).moduleEdges

  assert.notEqual(rebuiltExportIndex, firstExportIndex)
  assert.notEqual(rebuiltSurfaceIndex, firstSurfaceIndex)
  assert.notEqual(rebuiltEdges, firstEdges)
})

test("shared export-reference consumers keep detection parity and order", async () => {
  const checks = Array.make(testOnlyExports, passThroughWrappers, compositionForwarders)

  const detectionsByCheck = await runPoliciesOnFixture(evidenceFixturePath, checks)

  const testOnly = detectionsByCheck[0]
  const passThrough = detectionsByCheck[1]
  const forwarders = detectionsByCheck[2]
  assert.ok(testOnly !== undefined)
  assert.ok(passThrough !== undefined)
  assert.ok(forwarders !== undefined)

  const soloTestOnly = await runFixture(testOnlyExports)
  const soloPassThrough = await runFixture(passThroughWrappers)
  const soloForwarders = await runFixture(compositionForwarders)

  assert.deepEqual(
    Array.map(testOnly, detectionSnapshot),
    Array.map(soloTestOnly, detectionSnapshot)
  )
  assert.deepEqual(
    Array.map(passThrough, detectionSnapshot),
    Array.map(soloPassThrough, detectionSnapshot)
  )
  assert.deepEqual(
    Array.map(forwarders, detectionSnapshot),
    Array.map(soloForwarders, detectionSnapshot)
  )

  assert.ok(Array.some(testOnly, (detection) => Schema.is(TestOnlyExportData)(detection.data)))
  assert.ok(
    Array.some(passThrough, (detection) => Schema.is(PassThroughWrapperData)(detection.data))
  )
})

test("module graph and pass-through preserve detection parity and order", async () => {
  const checks = Array.make(moduleGraph, passThroughWrappers)

  const detectionsByCheck = await runPoliciesOnFixture(evidenceFixturePath, checks)

  const graphDetections = detectionsByCheck[0]
  assert.ok(graphDetections !== undefined)

  const soloGraph = await runFixture(moduleGraph)

  assert.deepEqual(
    Array.map(graphDetections, detectionSnapshot),
    Array.map(soloGraph, detectionSnapshot)
  )
  assert.ok(Array.some(graphDetections, (detection) => Schema.is(ModuleGraphData)(detection.data)))
})

test("importUsage counts default, named, aliased, and namespace imports in source order", async () => {
  const detectionsByCheck = await runPoliciesOnFixture(
    importUsageFixturePath,
    Array.of(importUsage)
  )
  const detections = detectionsByCheck[0] ?? Array.empty()
  const importData = Array.flatMap(detections, (detection) =>
    pipe(dataAs(Schema.is(ImportUsageData), detection), Option.toArray)
  )

  assert.equal(importData.length, 2)

  const namedImport = importData[0]
  const namespaceImport = importData[1]
  assert.ok(namedImport !== undefined)
  assert.ok(namespaceImport !== undefined)

  assert.equal(namedImport.specifier, "./lib.js")
  assert.equal(namespaceImport.specifier, "./lib.js")

  assert.deepEqual(
    Array.map(namedImport.names, (entry) => entry.name),
    ["defaultImport", "namedValue", "namedCall", "aliasedCall"]
  )
  assert.deepEqual(
    Array.map(namespaceImport.names, (entry) => entry.name),
    ["libNamespace"]
  )

  const defaultUsage = pipe(
    Array.findFirst(namedImport.names, (entry) => entry.name === "defaultImport"),
    Option.getOrThrow
  )
  const namedValueUsage = pipe(
    Array.findFirst(namedImport.names, (entry) => entry.name === "namedValue"),
    Option.getOrThrow
  )
  const namedCallUsage = pipe(
    Array.findFirst(namedImport.names, (entry) => entry.name === "namedCall"),
    Option.getOrThrow
  )
  const aliasedUsage = pipe(
    Array.findFirst(namedImport.names, (entry) => entry.name === "aliasedCall"),
    Option.getOrThrow
  )
  const namespaceUsage = pipe(
    Array.findFirst(namespaceImport.names, (entry) => entry.name === "libNamespace"),
    Option.getOrThrow
  )

  assert.equal(defaultUsage.referenceCount, 1)
  assert.equal(defaultUsage.callCount, 1)
  assert.equal(namedValueUsage.referenceCount, 1)
  assert.equal(namedValueUsage.callCount, 0)
  assert.equal(namedCallUsage.referenceCount, 2)
  assert.equal(namedCallUsage.callCount, 2)
  assert.equal(aliasedUsage.referenceCount, 1)
  assert.equal(aliasedUsage.callCount, 1)
  assert.equal(namespaceUsage.referenceCount, 2)
  assert.equal(namespaceUsage.callCount, 1)
})
