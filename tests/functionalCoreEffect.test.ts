import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { Chunk, Effect, Option, Schema, Stream, pipe } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { Signal } from "@better-typescript/core/engine/report/data"
import {
  functionalCoreEffectWiring,
  makeFunctionalCoreEffectChecks
} from "@better-typescript/checks/preset/functionalCoreEffectWiring"
import {
  FunctionalCoreBoundaryData,
  FunctionalCoreShapeData
} from "@better-typescript/checks/functionalCoreEffect/data"
import {
  ArchitectureRolePath,
  conventionalArchitectureRoleOf,
  defaultFunctionalCoreEffectPolicy,
  roleByPrefixes
} from "@better-typescript/checks/functionalCoreEffect/policy"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(
  testDirectory,
  "fixtures",
  "functional-core-effect"
)

const runFixtureSignals = async (): Promise<ReadonlyArray<Signal>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return Promise.all(
    functionalCoreEffectWiring.checks.map(async (named) => {
      const detections = await Promise.all(
        workspace.projects.map((project) =>
          Effect.runPromise(runCheckOnProject(named.check)(project))
        )
      )

      return new Signal({
        name: named.name,
        reported: named.reported,
        detections: detections.flat(),
        examples: named.examples
      })
    })
  )
}

const signalNamed = (signals: ReadonlyArray<Signal>, name: string): Signal => {
  const signal = signals.find((candidate) => candidate.name === name)
  assert.ok(signal)
  return signal
}

const collectAdvice = (
  signals: ReadonlyArray<Signal>
): Promise<ReadonlyArray<Advice>> =>
  Effect.runPromise(
    pipe(
      functionalCoreEffectWiring.derive(signals),
      Stream.runCollect,
      Effect.map(Chunk.toReadonlyArray)
    )
  )

const boundaryDataOf = (detection: Detection): FunctionalCoreBoundaryData => {
  assert.ok(Schema.is(FunctionalCoreBoundaryData)(detection.data))
  return detection.data
}

const boundarySummary = (detection: Detection): string => {
  const data = boundaryDataOf(detection)

  return `${detection.location.path}:${detection.location.line}:${data.kind}:${data.subject}`
}

const shapeSummary = (detection: Detection): string => {
  assert.ok(Schema.is(FunctionalCoreShapeData)(detection.data))
  const data = detection.data

  return `${detection.location.path}:${detection.location.line}:${data.kind}:${data.branchCount}:${data.functionCount}:${data.serviceCount}:${data.effectfulMemberCount}:${data.transformationCount}`
}

test("conventional and explicit role classifiers are deterministic", () => {
  assert.deepEqual(
    conventionalArchitectureRoleOf("packages/orders/src/domain/order.ts"),
    Option.some("domain")
  )
  assert.deepEqual(
    conventionalArchitectureRoleOf("packages/orders/src/ports/order.ts"),
    Option.some("port")
  )
  assert.deepEqual(
    conventionalArchitectureRoleOf("packages/orders/src/main.ts"),
    Option.some("root")
  )
  assert.deepEqual(
    conventionalArchitectureRoleOf("packages/orders/tests/order.test.ts"),
    Option.some("test")
  )
  assert.equal(
    Option.isNone(
      conventionalArchitectureRoleOf("packages/orders/src/shared/order.ts")
    ),
    true
  )

  const explicit = roleByPrefixes([
    new ArchitectureRolePath({ path: "src", role: "application" }),
    new ArchitectureRolePath({ path: "src/domain", role: "domain" })
  ])

  assert.deepEqual(explicit("src/domain/order.ts"), Option.some("domain"))
  assert.deepEqual(explicit("src/useCase.ts"), Option.some("application"))
})

test("boundary check reports every invariant and preserves allowed neighbors", async () => {
  const signals = await runFixtureSignals()
  const boundary = signalNamed(signals, "functional-core-effect-boundaries")
  const actual = boundary.detections.map(boundarySummary).sort()

  assert.deepEqual(
    actual,
    [
      "src/adapters/foreign.ts:15:unsuspended-adapter-effect:node:fs:readFileSync",
      "src/adapters/foreign.ts:26:unscoped-resource:@acme/sdk:PaymentClient",
      "src/adapters/foreign.ts:44:unscoped-resource:@acme/sdk:createClient",
      "src/adapters/foreign.ts:57:escaping-runtime-state:effect:Ref.unsafeMake",
      "src/application/badDependency.ts:1:dependency-direction:application -> adapter",
      "src/application/badReexport.ts:1:dependency-direction:application -> adapter",
      "src/application/barrelRuntime.ts:3:runtime-execution:effect:Effect.runSync",
      "src/application/capabilities.ts:2:direct-capability:node:fs",
      "src/application/capabilities.ts:7:direct-capability:fetch",
      "src/application/runtime.ts:14:runtime-execution:effect:Effect.runPromise",
      "src/application/runtime.ts:15:dependency-provisioning:effect:Effect.provideService",
      "src/application/runtime.ts:18:dependency-provisioning:effect:Effect.provide",
      "src/application/runtime.ts:23:service-locator:effect:Effect.context",
      "src/application/runtime.ts:25:service-locator:Context.Context",
      "src/application/runtime.ts:26:service-locator:effect:Context.get",
      "src/application/runtime.ts:28:escaping-runtime-state:effect:Ref.unsafeMake",
      "src/application/runtime.ts:30:runtime-execution:effect:Effect.runCallback",
      "src/application/runtime.ts:31:dependency-provisioning:DefaultPort.Default",
      "src/application/runtime.ts:33:dependency-provisioning:effect:ManagedRuntime.make",
      "src/application/runtime.ts:37:runtime-execution:managedRuntime.runPromise",
      "src/domain/barrelEffect.ts:1:domain-effect-program:effect",
      "src/domain/effectFacade.ts:1:domain-effect-program:effect",
      "src/domain/effectful.ts:1:domain-effect-program:effect",
      "src/domain/effectful.ts:6:domain-effect-program:Promise",
      "src/domain/effectful.ts:8:domain-effect-program:Promise",
      "src/domain/namespaceEffect.ts:1:domain-effect-program:effect",
      "src/ports/badPort.ts:7:infrastructure-contract:Promise",
      "src/ports/badPort.ts:8:infrastructure-contract:effect:Ref.Ref",
      "src/ports/badPort.ts:9:infrastructure-contract:@acme/sdk:PaymentClient",
      "src/ports/badPort.ts:10:service-locator:Context.Context",
      "src/ports/badPort.ts:15:port-live-implementation:DefaultPort.dependencies",
      "src/ports/badPort.ts:34:infrastructure-contract:@acme/sdk:PaymentClient",
      "src/ports/badPort.ts:37:service-locator:Context.Context",
      "src/ports/badPort.ts:41:service-locator:AliasedContextContract",
      "src/ports/badPort.ts:14:port-live-implementation:DefaultPort",
      "src/ports/badPort.ts:26:port-live-implementation:effect:Layer.succeed"
    ].sort()
  )

  const kinds = boundary.detections.map((item) => boundaryDataOf(item).kind)

  assert.deepEqual(
    new Set(kinds),
    new Set([
      "dependency-direction",
      "domain-effect-program",
      "direct-capability",
      "runtime-execution",
      "dependency-provisioning",
      "port-live-implementation",
      "infrastructure-contract",
      "service-locator",
      "unsuspended-adapter-effect",
      "unscoped-resource",
      "escaping-runtime-state"
    ])
  )

  assert.equal(
    boundary.detections.some((item) => item.location.path === "src/main.ts"),
    false
  )
  assert.equal(
    boundary.detections.some(
      (item) => item.location.path === "src/domain/pure.ts"
    ),
    false
  )
  assert.equal(
    boundary.detections.some(
      (item) => item.location.path === "src/adapters/orderLive.ts"
    ),
    false
  )
  assert.equal(
    boundary.detections.some(
      (item) => item.location.path === "src/domain/shadowedPromise.ts"
    ),
    false
  )
  assert.equal(
    boundary.detections.some(
      (item) => item.location.path === "src/domain/namespacePure.ts"
    ),
    false
  )
})

test("shape evidence and advice require the documented thresholds", async () => {
  const signals = await runFixtureSignals()
  const shape = signalNamed(signals, "functional-core-effect-shape-evidence")
  const actualShapes = shape.detections.map(shapeSummary).sort()

  assert.deepEqual(actualShapes, [
    "src/adapters/businessPolicy.ts:1:adapter-business-logic:3:2:0:0:0",
    "src/application/effectPureService.ts:3:pure-service:0:1:1:0:0",
    "src/application/orchestrator.ts:13:pure-service:0:1:1:0:0",
    "src/application/orchestrator.ts:23:effect-orchestrator:2:1:2:2:0",
    "src/application/transformOrchestrator.ts:17:effect-orchestrator:0:1:2:2:3",
    "src/entrypoints/thick.ts:1:thick-composition-root:2:2:0:0:0"
  ])

  const advice = await collectAdvice(signals)
  const actualAdvice = advice
    .map((item) => `${item.location.path}:${item.title}`)
    .sort()

  assert.deepEqual(actualAdvice, [
    "src/adapters/businessPolicy.ts:business logic in an adapter",
    "src/application/effectPureService.ts:pure service candidate",
    "src/application/orchestrator.ts:overgrown Effect orchestrator",
    "src/application/orchestrator.ts:pure service candidate",
    "src/application/runtime.ts:imperative core",
    "src/application/transformOrchestrator.ts:overgrown Effect orchestrator",
    "src/entrypoints/thick.ts:thick composition root"
  ])
})

test("wiring exposes one reported policy check and silent shape evidence", () => {
  const checks = makeFunctionalCoreEffectChecks(
    defaultFunctionalCoreEffectPolicy
  )

  assert.deepEqual(
    checks.map((check) => [check.name, check.reported]),
    [
      ["functional-core-effect-boundaries", true],
      ["functional-core-effect-shape-evidence", false]
    ]
  )
  assert.equal(checks[0]?.examples.length, 1)
})
