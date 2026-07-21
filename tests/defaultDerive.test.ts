import * as assert from "node:assert/strict"
import { test } from "node:test"
import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"
import { Detection } from "@better-typescript/core/engine/location/data"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example"
import { Location } from "@better-typescript/core/engine/location/data"
import { Signal } from "@better-typescript/core/engine/signal/data"

const range = (count: number): ReadonlyArray<number> =>
  Array.from({ length: count }, (_, index) => index + 1)

const detectionAt = (path: string, line: number, data?: unknown): Detection =>
  Detection.make({
    location: Location.make({ path, line, column: 1 }),
    message: "message",
    hint: "hint",
    ...(data === undefined ? {} : { data })
  })

const detectionsAt = (path: string, count: number, data?: unknown): ReadonlyArray<Detection> =>
  range(count).map((line) => detectionAt(path, line, data))

const reportedSignal = (name: string, detections: ReadonlyArray<Detection>): Signal =>
  new Signal({ name, reported: true, detections, examples: emptyRefactorExampleSource })

const silentSignal = (name: string, detections: ReadonlyArray<Detection>): Signal =>
  new Signal({ name, reported: false, detections, examples: emptyRefactorExampleSource })

const adviceWithTitle = (advice: ReadonlyArray<Advice>, title: string): ReadonlyArray<Advice> =>
  advice.filter((item) => item.title === title)

const adviceCount = (advice: ReadonlyArray<Advice>, title: string): number =>
  adviceWithTitle(advice, title).length

test("defaultDerive excludes silent signals from reported aggregate advice", () => {
  const advice = defaultWiring.derive([silentSignal("no-throw", detectionsAt("src/silent.ts", 10))])

  assert.equal(adviceCount(advice, "high signal density"), 0)
  assert.deepEqual(advice, [])
})

test("defaultDerive feeds systemic hotspots density after fallback suppression", () => {
  const sharedState = { target: "shared-state" }
  const mcpFiles = ["src/mcp/one.ts", "src/mcp/two.ts", "src/mcp/three.ts"]
  const suppressedDensityFiles = [...mcpFiles, "src/specific.ts"]
  const noMutation = suppressedDensityFiles.flatMap((path) => detectionsAt(path, 10, sharedState))
  const noThrow = detectionsAt("src/dense.ts", 10)
  const advice = defaultWiring.derive([
    reportedSignal("no-mutation", noMutation),
    reportedSignal("no-throw", noThrow)
  ])
  const densityAdvice = adviceWithTitle(advice, "high signal density")

  assert.equal(adviceCount(advice, "hot subsystem"), 1)
  assert.equal(adviceCount(advice, "high signal density"), 1)
  assert.deepEqual(
    densityAdvice.map((item) => item.location.path),
    ["src/dense.ts"]
  )
  assert.equal(adviceCount(advice, "systemic hotspots"), 0)
})
