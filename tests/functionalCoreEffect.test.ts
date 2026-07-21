import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { Effect, Option, Schema, Array } from "effect"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { Signal } from "@better-typescript/core/engine/signal/data"
import { makeRefactorExampleResolver } from "@better-typescript/core/engine/example"
import {
  ArchitectureRolePath,
  conventionalArchitectureRoleOf,
  roleByPrefixes
} from "@better-typescript/guidance/architectureRole"
import { defaultFunctionalCoreEffectPolicy } from "@better-typescript/matchers/builtins/functionalCoreEffect/policy"
import {
  functionalCoreEffectWiring,
  makeFunctionalCoreEffectWiring
} from "@better-typescript/guidance/preset/functionalCoreEffectWiring"
import {
  FunctionalCoreBoundaryData,
  FunctionalCoreShapeData
} from "@better-typescript/matchers/builtins/functionalCoreEffect/data"
import { loadProject, runPolicyOnProject } from "@better-typescript/core/project/loadProject"
import { isProgramPolicy } from "@better-typescript/core/engine/wiring/data"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "functional-core-effect")

const runFixtureSignals = async (): Promise<ReadonlyArray<Signal>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return Promise.all(
    functionalCoreEffectWiring.policies.filter(isProgramPolicy).map(async (named) => {
      const detections = await Promise.all(
        workspace.projects.map((project) =>
          Effect.runPromise(runPolicyOnProject(Array.of(named))(project))
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

const collectAdvice = (signals: ReadonlyArray<Signal>): ReadonlyArray<Advice> =>
  functionalCoreEffectWiring.derive(signals)

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
    Option.isNone(conventionalArchitectureRoleOf("packages/orders/src/shared/order.ts")),
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
      "src/adapters/foreign.ts:51:escaping-runtime-state:effect:Ref.makeUnsafe",
      "src/adapters/foreign.ts:57:escaping-runtime-state:effect:Ref.makeUnsafe",
      "src/adapters/foreign.ts:62:unscoped-resource:@acme/sdk:createClient",
      "src/application/badDependency.ts:1:dependency-direction:application -> adapter",
      "src/application/badReexport.ts:1:dependency-direction:application -> adapter",
      "src/application/barrelRuntime.ts:3:runtime-execution:effect:Effect.runSync",
      "src/application/capabilities.ts:1:direct-capability:effect:FileSystem",
      "src/application/capabilities.ts:2:direct-capability:node:fs",
      "src/application/capabilities.ts:7:direct-capability:fetch",
      "src/application/runtime.ts:19:runtime-execution:effect:Effect.runPromise",
      "src/application/runtime.ts:20:dependency-provisioning:effect:Effect.provideService",
      "src/application/runtime.ts:23:dependency-provisioning:effect:Effect.provide",
      "src/application/runtime.ts:28:dependency-provisioning:effect:Effect.provideContext",
      "src/application/runtime.ts:33:runtime-execution:effect:Effect.runPromiseWith",
      "src/application/runtime.ts:35:runtime-execution:effect:Effect.void.pipe",
      "src/application/runtime.ts:37:service-locator:effect:Effect.context",
      "src/application/runtime.ts:39:service-locator:Context.Context",
      "src/application/runtime.ts:40:service-locator:effect:Context.getUnsafe",
      "src/application/runtime.ts:48:escaping-runtime-state:effect:Ref.makeUnsafe",
      "src/application/runtime.ts:50:escaping-runtime-state:effect:Latch.makeUnsafe",
      "src/application/runtime.ts:52:runtime-execution:effect:Effect.runCallback",
      "src/application/runtime.ts:53:dependency-provisioning:DefaultPort.layer",
      "src/application/runtime.ts:55:dependency-provisioning:effect:ManagedRuntime.make",
      "src/application/runtime.ts:59:runtime-execution:managedRuntime.runPromise",
      "src/application/runtime.ts:61:runtime-execution:@effect/platform-browser/BrowserRuntime:runMain",
      "src/domain/barrelEffect.ts:1:domain-effect-program:effect",
      "src/domain/effectFacade.ts:1:domain-effect-program:effect",
      "src/domain/effectful.ts:1:domain-effect-program:effect",
      "src/domain/effectful.ts:6:domain-effect-program:Promise",
      "src/domain/effectful.ts:8:domain-effect-program:Promise",
      "src/domain/latchState.ts:1:domain-effect-program:effect",
      "src/domain/latchState.ts:3:escaping-runtime-state:effect:Latch.makeUnsafe",
      "src/domain/latchState.ts:4:escaping-runtime-state:effect:Semaphore.makeUnsafe",
      "src/domain/namespaceEffect.ts:1:domain-effect-program:effect",
      "src/ports/badPort.ts:7:infrastructure-contract:Promise",
      "src/ports/badPort.ts:8:infrastructure-contract:effect:Ref.Ref",
      "src/ports/badPort.ts:9:infrastructure-contract:@acme/sdk:PaymentClient",
      "src/ports/badPort.ts:10:service-locator:Context.Context",
      "src/ports/badPort.ts:14:port-live-implementation:DefaultPort",
      "src/ports/badPort.ts:19:port-live-implementation:DefaultPort.layer",
      "src/ports/badPort.ts:19:port-live-implementation:effect:Layer.effect",
      "src/ports/badPort.ts:20:dependency-provisioning:effect:Layer.provide",
      "src/ports/badPort.ts:29:port-live-implementation:effect:Layer.succeed",
      "src/ports/badPort.ts:37:infrastructure-contract:@acme/sdk:PaymentClient",
      "src/ports/badPort.ts:40:service-locator:Context.Context",
      "src/ports/badPort.ts:44:service-locator:AliasedContextContract",
      "src/ports/badPort.ts:51:port-live-implementation:FunctionLivePort"
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
    boundary.detections.some((item) => item.location.path === "src/domain/pure.ts"),
    false
  )
  assert.equal(
    boundary.detections.some((item) => item.location.path === "src/adapters/orderLive.ts"),
    false
  )
  assert.equal(
    boundary.detections.some((item) => item.location.path === "src/domain/shadowedPromise.ts"),
    false
  )
  assert.equal(
    boundary.detections.some((item) => item.location.path === "src/domain/namespacePure.ts"),
    false
  )
  assert.equal(
    boundary.detections.some(
      (item) =>
        item.location.path === "src/application/runtime.ts" &&
        boundarySummary(item).includes("referenceOverride")
    ),
    false
  )
  assert.equal(
    boundary.detections.some(
      (item) =>
        boundaryDataOf(item).kind === "dependency-provisioning" &&
        boundaryDataOf(item).subject.includes("LogLevel")
    ),
    false
  )
  assert.equal(
    boundary.detections.some(
      (item) =>
        item.location.path === "src/adapters/foreign.ts" &&
        boundarySummary(item).includes("disposableClient")
    ),
    false
  )
  assert.equal(
    boundary.detections.some(
      (item) =>
        item.location.path === "src/adapters/foreign.ts" &&
        boundaryDataOf(item).kind === "unscoped-resource" &&
        item.location.line === 33
    ),
    false
  )
  assert.equal(
    boundary.detections.some(
      (item) =>
        item.location.path === "src/adapters/foreign.ts" &&
        boundaryDataOf(item).kind === "unscoped-resource" &&
        item.location.line === 35
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
    "src/application/transformOrchestrator.ts:18:effect-orchestrator:0:1:2:2:3",
    "src/entrypoints/thick.ts:1:thick-composition-root:2:2:0:0:0",
    "src/ports/badPort.ts:14:pure-service:0:1:1:0:0"
  ])

  const advice = collectAdvice(signals)
  const actualAdvice = advice.map((item) => `${item.location.path}:${item.title}`).sort()

  assert.deepEqual(actualAdvice, [
    "src/adapters/businessPolicy.ts:business logic in an adapter",
    "src/application/effectPureService.ts:pure service candidate",
    "src/application/orchestrator.ts:overgrown Effect orchestrator",
    "src/application/orchestrator.ts:pure service candidate",
    "src/application/runtime.ts:imperative core",
    "src/application/transformOrchestrator.ts:overgrown Effect orchestrator",
    "src/domain/latchState.ts:imperative core",
    "src/entrypoints/thick.ts:thick composition root",
    "src/ports/badPort.ts:pure service candidate"
  ])
})

test("wiring exposes one reported policy and silent shape evidence", async () => {
  const policies = makeFunctionalCoreEffectWiring(defaultFunctionalCoreEffectPolicy).policies
  const boundaryPolicy = policies[0]
  assert.ok(boundaryPolicy)
  const resolve = await Effect.runPromise(makeRefactorExampleResolver())
  const boundaryExamples = await Effect.runPromise(resolve(boundaryPolicy.examples))

  assert.deepEqual(
    policies.map((policy) => [policy.name, policy.reported]),
    [
      ["functional-core-effect-boundaries", true],
      ["functional-core-effect-shape-evidence", false]
    ]
  )
  assert.equal(boundaryExamples.length, 1)
})
