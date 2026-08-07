import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"
import { detectionsAt } from "./defaultDeriveDetections.js"
import { reportedSignal } from "./defaultDeriveReportedSignal.js"
import { silentSignal } from "./defaultDeriveSilentSignal.js"
import { adviceWithTitle } from "./defaultDeriveAdviceWithTitle.js"
import { adviceCount } from "./defaultDeriveAdviceCount.js"

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
