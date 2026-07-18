import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Effect, Stream } from "effect"
import { highSignalDensity } from "@better-typescript/checks/highSignalDensity"
import { hotSubsystem } from "@better-typescript/checks/hotSubsystem"
import { imperativeStateManager } from "@better-typescript/checks/imperativeStateManager"
import { pipelineHostile } from "@better-typescript/checks/pipelineHostile"
import { ruleDominance } from "@better-typescript/checks/ruleDominance"
import { sideEffectLaundering } from "@better-typescript/checks/sideEffectLaundering"
import { systemicHotspots } from "@better-typescript/checks/systemicHotspots"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example"
import { Location } from "@better-typescript/core/engine/location/data"
import { NamedDetection } from "@better-typescript/core/engine/derive/data"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { Detection } from "@better-typescript/core/engine/location/data"

function signalAt(path: string, line: number, data?: unknown): Detection {
  return Detection.make({
    location: Location.make({ path, line, column: 1 }),
    message: "message",
    hint: "hint",
    ...(arguments.length >= 3 ? { data } : {})
  })
}

const range = (count: number): ReadonlyArray<number> =>
  Array.from({ length: count }, (_, index) => index + 1)

const namedElements = (
  name: string,
  elements: ReadonlyArray<Detection>
): ReadonlyArray<NamedDetection> =>
  elements.map((detection) => NamedDetection.make({ name, detection }))

const signalStream = <A>(elements: ReadonlyArray<A>): Stream.Stream<A> =>
  Stream.fromIterable(elements)

const collectAdvice = <E>(advice: Stream.Stream<Advice, E>): Promise<ReadonlyArray<Advice>> =>
  Effect.runPromise(Stream.runCollect(advice))

const adviceTitles = (advice: ReadonlyArray<Advice>): ReadonlyArray<string> =>
  advice.map((item) => item.title)

const evidenceMeasures = (advice: Advice): ReadonlyArray<string> =>
  advice.evidence.map((item) => item.measure)

test("imperativeStateManager fires on shared-state mutation density", async () => {
  const mutations = range(10).map((line) =>
    signalAt("src/state/manager.ts", line, { target: "shared-state" })
  )
  const hashMapSignals = [
    signalAt("src/state/manager.ts", 20),
    signalAt("src/state/manager.ts", 21)
  ]
  const advice = await collectAdvice(
    imperativeStateManager({
      noMutation: signalStream(mutations),
      preferHashMap: signalStream(hashMapSignals),
      preferHashSet: Stream.empty,
      noMutableArrayMethods: Stream.empty,
      noMutableVariableDeclarations: Stream.empty
    })
  )

  assert.deepEqual(adviceTitles(advice), ["imperative state manager"])
  assert.equal(advice[0]?.location.path, "src/state/manager.ts")
  assert.equal(advice[0]?.level, "file")
  assert.deepEqual(evidenceMeasures(advice[0]!), [
    "no-mutation/shared-state",
    "no-mutation",
    "prefer-hash-map"
  ])
})

test("imperativeStateManager ignores local mutations and below-threshold shared mutations", async () => {
  const localMutations = range(10).map((line) => signalAt("src/fold.ts", line, { target: "local" }))
  const fewSharedMutations = range(7).map((line) =>
    signalAt("src/state/manager.ts", line, { target: "shared-state" })
  )

  assert.deepEqual(
    await collectAdvice(
      imperativeStateManager({
        noMutation: signalStream(localMutations),
        preferHashMap: Stream.empty,
        preferHashSet: Stream.empty,
        noMutableArrayMethods: Stream.empty,
        noMutableVariableDeclarations: Stream.empty
      })
    ),
    []
  )
  assert.deepEqual(
    await collectAdvice(
      imperativeStateManager({
        noMutation: signalStream(fewSharedMutations),
        preferHashMap: Stream.empty,
        preferHashSet: Stream.empty,
        noMutableArrayMethods: Stream.empty,
        noMutableVariableDeclarations: Stream.empty
      })
    ),
    []
  )
})

test("highSignalDensity reports dense files with total and per-rule evidence", async () => {
  const noThrowSignals = range(10).map((line) => signalAt("src/hot.ts", line))
  const advice = await collectAdvice(
    highSignalDensity(signalStream(namedElements("no-throw", noThrowSignals)))
  )

  assert.deepEqual(adviceTitles(advice), ["high signal density"])
  assert.equal(advice[0]?.location.path, "src/hot.ts")
  assert.deepEqual(evidenceMeasures(advice[0]!), ["signals", "no-throw"])
  assert.equal(advice[0]?.evidence[1]?.count, 10)
})

test("sideEffectLaundering fires on repeated same-line collisions between distinct rules", async () => {
  const advice = await collectAdvice(
    sideEffectLaundering(
      signalStream([
        ...namedElements("no-mutation", [
          signalAt("src/useRun.ts", 153),
          signalAt("src/useRun.ts", 180)
        ]),
        ...namedElements("no-void-functions", [
          signalAt("src/useRun.ts", 153),
          signalAt("src/useRun.ts", 180)
        ])
      ])
    )
  )

  assert.deepEqual(adviceTitles(advice), ["colliding fixes on shared expressions"])
  assert.deepEqual(evidenceMeasures(advice[0]!), [
    "line 153: no-mutation + no-void-functions",
    "line 180: no-mutation + no-void-functions"
  ])
})

test("sideEffectLaundering stays quiet for a single colliding line", async () => {
  const advice = await collectAdvice(
    sideEffectLaundering(
      signalStream([
        ...namedElements("no-mutation", [signalAt("src/useRun.ts", 153)]),
        ...namedElements("no-void-functions", [signalAt("src/useRun.ts", 153)])
      ])
    )
  )

  assert.deepEqual(advice, [])
})

test("pipelineHostile combines nested-call and uncurried-helper signals", async () => {
  const nested = range(5).map((line) => signalAt("src/fold.ts", line))
  const uncurried = range(5).map((line) => signalAt("src/fold.ts", line + 10))
  const advice = await collectAdvice(
    pipelineHostile({
      noNestedCalls: signalStream(nested),
      preferCurriedDataLastFunctions: signalStream(uncurried)
    })
  )

  assert.deepEqual(adviceTitles(advice), ["pipeline-hostile module"])
  assert.deepEqual(evidenceMeasures(advice[0]!), [
    "no-nested-calls",
    "prefer-curried-data-last-functions"
  ])
})

test("ruleDominance fires at project level for a widespread dominant rule", async () => {
  const dominant = range(25).map((line) => signalAt(`pkg${line % 5}/src/file.ts`, line))
  const rest = range(5).map((line) => signalAt("other/other.ts", line))
  const advice = await collectAdvice(
    ruleDominance(
      signalStream([...namedElements("no-throw", dominant), ...namedElements("no-mutation", rest)])
    )
  )

  assert.deepEqual(adviceTitles(advice), ["one rule dominates the run"])
  assert.equal(advice[0]?.level, "project")
  assert.deepEqual(evidenceMeasures(advice[0]!), ["signals", "no-throw"])
  assert.equal(advice[0]?.evidence[1]?.count, 25)
})

test("hotSubsystem reports the deepest qualifying directory", async () => {
  const subsystem = range(27).map((line) => signalAt(`src/mcp/file${line % 3}.ts`, line))
  const elsewhere = range(3).map((line) => signalAt("web/useRun.ts", line))
  const advice = await collectAdvice(
    hotSubsystem(
      signalStream([
        ...namedElements("no-throw", subsystem),
        ...namedElements("no-mutation", elsewhere)
      ])
    )
  )

  assert.deepEqual(
    advice.map((item) => item.location.path),
    ["src/mcp"]
  )
  assert.deepEqual(adviceTitles(advice), ["hot subsystem"])
})

test("systemicHotspots fires only when subsystem and dense-file advice are both present", async () => {
  const hot: Advice = {
    location: Location.make({ path: "src/mcp" }),
    level: "directory",
    title: "hot subsystem",
    remediation: "fix subsystem",
    evidence: [{ measure: "signals", count: 27 }],
    examples: emptyRefactorExampleSource
  }
  const firstDense: Advice = {
    location: Location.make({ path: "src/one.ts" }),
    level: "file",
    title: "high signal density",
    remediation: "fix one",
    evidence: [{ measure: "signals", count: 10 }],
    examples: emptyRefactorExampleSource
  }
  const secondDense: Advice = {
    location: Location.make({ path: "src/two.ts" }),
    level: "file",
    title: "high signal density",
    remediation: "fix two",
    evidence: [{ measure: "signals", count: 10 }],
    examples: emptyRefactorExampleSource
  }

  assert.deepEqual(
    await collectAdvice(
      systemicHotspots({
        hotSubsystem: signalStream([hot]),
        highSignalDensity: signalStream([firstDense])
      })
    ),
    []
  )

  const advice = await collectAdvice(
    systemicHotspots({
      hotSubsystem: signalStream([hot]),
      highSignalDensity: signalStream([firstDense, secondDense])
    })
  )

  assert.deepEqual(adviceTitles(advice), ["systemic hotspots"])
  assert.equal(advice[0]?.level, "project")
  assert.deepEqual(evidenceMeasures(advice[0]!), ["hot-subsystem", "high-signal-density"])
})
