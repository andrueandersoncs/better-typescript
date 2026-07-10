import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Chunk, Effect, Stream } from "effect"
import { defaultDerive } from "../src/preset/defaultWiring.js"
import { Detection } from "../src/engine/check.js"
import type { Advice } from "../src/engine/derive.js"
import { Location } from "../src/engine/location.js"
import { Signal } from "../src/engine/report.js"

const range = (count: number): ReadonlyArray<number> =>
  Array.from({ length: count }, (_, index) => index + 1)

const detectionAt = (path: string, line: number, data?: unknown): Detection =>
  new Detection({
    location: new Location({ path, line, column: 1 }),
    message: "message",
    hint: "hint",
    ...(data === undefined ? {} : { data })
  })

const detectionsAt = (
  path: string,
  count: number,
  data?: unknown
): ReadonlyArray<Detection> =>
  range(count).map((line) => detectionAt(path, line, data))

const reportedSignal = (
  name: string,
  detections: ReadonlyArray<Detection>
): Signal => new Signal({ name, reported: true, detections })

const silentSignal = (
  name: string,
  detections: ReadonlyArray<Detection>
): Signal => new Signal({ name, reported: false, detections })

const collectAdvice = (
  advice: Stream.Stream<Advice, Error>
): Promise<ReadonlyArray<Advice>> =>
  Effect.runPromise(
    Effect.map(Stream.runCollect(advice), Chunk.toReadonlyArray)
  )

const adviceWithTitle = (
  advice: ReadonlyArray<Advice>,
  title: string
): ReadonlyArray<Advice> => advice.filter((item) => item.title === title)

const adviceCount = (advice: ReadonlyArray<Advice>, title: string): number =>
  adviceWithTitle(advice, title).length

test("defaultDerive excludes silent signals from reported aggregate advice", async () => {
  const advice = await collectAdvice(
    defaultDerive([silentSignal("no-throw", detectionsAt("src/silent.ts", 10))])
  )

  assert.equal(adviceCount(advice, "high signal density"), 0)
  assert.deepEqual(advice, [])
})

test("defaultDerive feeds systemic hotspots density after fallback suppression", async () => {
  const sharedState = { target: "shared-state" }
  const mcpFiles = ["src/mcp/one.ts", "src/mcp/two.ts", "src/mcp/three.ts"]
  const suppressedDensityFiles = [...mcpFiles, "src/specific.ts"]
  const noMutation = suppressedDensityFiles.flatMap((path) =>
    detectionsAt(path, 10, sharedState)
  )
  const noThrow = detectionsAt("src/dense.ts", 10)
  const advice = await collectAdvice(
    defaultDerive([
      reportedSignal("no-mutation", noMutation),
      reportedSignal("no-throw", noThrow)
    ])
  )
  const densityAdvice = adviceWithTitle(advice, "high signal density")

  assert.equal(adviceCount(advice, "hot subsystem"), 1)
  assert.equal(adviceCount(advice, "high signal density"), 1)
  assert.deepEqual(
    densityAdvice.map((item) => item.location.path),
    ["src/dense.ts"]
  )
  assert.equal(adviceCount(advice, "systemic hotspots"), 0)
})
