import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { Effect, Option, Schema, pipe, Array } from "effect"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { passThroughWrappers } from "@better-typescript/checks/architectureExplore/passThroughWrappers"
import { interfaceBurden } from "@better-typescript/checks/architectureExplore/interfaceBurden"
import { moduleGraph } from "@better-typescript/checks/architectureExplore/moduleGraph"
import { testOnlyExports } from "@better-typescript/checks/architectureExplore/testOnlyExports"
import { seamLeakageEvidence } from "@better-typescript/checks/architectureExplore/seamLeakageEvidence"
import { externalDependencyConstruction } from "@better-typescript/checks/architectureExplore/externalDependencyConstruction"
import { singleAdapterSeams } from "@better-typescript/checks/architectureExplore/singleAdapterSeams"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  ExternalDependencyConstructionData,
  InterfaceBurdenData,
  ModuleGraphData,
  PassThroughWrapperData,
  SeamLeakageData,
  SingleAdapterSeamData,
  TestOnlyExportData
} from "@better-typescript/checks/architectureExplore/data"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "architecture-evidence")

const runFixture = async (namedCheck: NamedCheck): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectDetections = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(namedCheck.check))(project))
    )
  )

  return projectDetections.flat()
}

const dataAs = <A>(
  guard: (input: unknown) => input is A,
  detection: Detection
): Option.Option<A> => {
  const data = detection.data

  return guard(data) ? Option.some(data) : Option.none()
}

test("pass-through evidence requires exact forwarding and records caller leverage", async () => {
  const detections = await runFixture(passThroughWrappers)
  const forwarding = detections.filter((item) => item.location.path === "src/forwarding.ts")
  const byLine = new Map(forwarding.map((item) => [item.location.line, item] as const))
  const forwardData = pipe(
    Option.fromNullishOr(byLine.get(5)),
    Option.flatMap((item) => dataAs(Schema.is(PassThroughWrapperData), item)),
    Option.getOrThrow
  )
  const sharedData = pipe(
    Option.fromNullishOr(byLine.get(8)),
    Option.flatMap((item) => dataAs(Schema.is(PassThroughWrapperData), item)),
    Option.getOrThrow
  )

  assert.equal(forwardData.callerCount, 1)
  assert.equal(sharedData.callerCount, 2)
  assert.equal(byLine.has(13), false)
  assert.equal(byLine.has(15), false)

  const reexport = detections.find((item) => item.location.path === "src/publicEntry.ts")
  const reexportData = pipe(
    Option.fromNullishOr(reexport),
    Option.flatMap((item) => dataAs(Schema.is(PassThroughWrapperData), item)),
    Option.getOrThrow
  )

  assert.equal(reexportData.kind, "reexport")
  assert.equal(reexportData.callerCount, 1)
})

test("interface burden measures callable knowledge without implementation size", async () => {
  const detections = await runFixture(interfaceBurden)
  const burden = detections.find((item) => item.location.path === "src/burden.ts")
  const data = pipe(
    Option.fromNullishOr(burden),
    Option.flatMap((item) => dataAs(Schema.is(InterfaceBurdenData), item)),
    Option.getOrThrow
  )

  assert.equal(data.operationCount, 4)
  assert.equal(data.requiredParameterCount, 4)
})

test("module graph records resolved project edges", async () => {
  const detections = await runFixture(moduleGraph)
  const graph = detections.find((item) => item.location.path === "src/graph/one.ts")
  const data = pipe(
    Option.fromNullishOr(graph),
    Option.flatMap((item) => dataAs(Schema.is(ModuleGraphData), item)),
    Option.getOrThrow
  )

  assert.deepEqual(data.importedPaths, ["src/graph/two.ts"])
})

test("test-only exports distinguish production and test references", async () => {
  const detections = await runFixture(testOnlyExports)
  const testSurface = detections.filter((item) => item.location.path === "src/testSurface.ts")
  const publicOnly = detections.filter((item) => item.location.path === "src/publicOnly.ts")
  const data = pipe(
    Option.fromNullishOr(testSurface[0]),
    Option.flatMap((item) => dataAs(Schema.is(TestOnlyExportData), item)),
    Option.getOrThrow
  )

  assert.equal(testSurface.length, 1)
  assert.equal(testSurface[0]?.location.line, 1)
  assert.deepEqual(data.testPaths, ["tests/surface.ts"])
  assert.equal(publicOnly.length, 0)
})

test("seam leakage distinguishes internal and package-source test imports", async () => {
  const detections = await runFixture(seamLeakageEvidence)
  const testLeaks = detections.filter((item) => item.location.path === "tests/surface.ts")
  const payloads = testLeaks.flatMap((item) =>
    Option.toArray(dataAs(Schema.is(SeamLeakageData), item))
  )
  const sourceLeaks = payloads.filter((data) => data.kind === "source-path")

  assert.equal(
    payloads.every((data) => data.fromTest),
    true
  )
  assert.equal(
    payloads.some((data) => data.kind === "internal-path"),
    true
  )
  assert.deepEqual(
    sourceLeaks.map((data) => data.importedPath),
    ["@acme/payments/src/checkout.js"]
  )
  assert.equal(
    payloads.some((data) => data.importedPath === "../src/testSurface.js"),
    false
  )
})

test("external construction ignores factories and composition roots", async () => {
  const detections = await runFixture(externalDependencyConstruction)
  const payloads = detections.flatMap((item) =>
    Option.toArray(dataAs(Schema.is(ExternalDependencyConstructionData), item))
  )

  assert.deepEqual(payloads.map((data) => data.collaboratorName).sort(), [
    "AuditClient",
    "PaymentClient"
  ])
  assert.equal(
    detections.some((item) => item.location.path === "src/main.ts"),
    false
  )
})

test("single-adapter seams count production and test adapters", async () => {
  const detections = await runFixture(singleAdapterSeams)
  const payloads = detections.flatMap((item) =>
    Option.toArray(dataAs(Schema.is(SingleAdapterSeamData), item))
  )

  assert.deepEqual(payloads.map((data) => data.interfaceName).sort(), ["PaymentPort", "Reader"])
  assert.equal(
    payloads.some((data) => data.interfaceName === "StablePort"),
    false
  )
  assert.equal(
    payloads.every((data) => data.productionAdapterCount === 1),
    true
  )
  assert.equal(
    payloads.every((data) => data.testAdapterCount === 0),
    true
  )
})
