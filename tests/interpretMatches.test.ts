import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Finding, rules } from "../src/rules/index.js"
import { interpretMatches } from "../src/runner/interpretMatches.js"
import { syndromeRegistry } from "../src/syndromes/index.js"

const interpret = interpretMatches(syndromeRegistry)(rules)

const matchAt = (
  ruleId: string,
  fileName: string,
  line: number,
  facets: ReadonlyArray<string> = []
): Finding =>
  new Finding({
    detectorId: ruleId,
    path: fileName,
    line,
    column: 1,
    message: "message",
    hint: "hint",
    facets
  })

const range = (count: number): ReadonlyArray<number> =>
  Array.from({ length: count }, (_, index) => index + 1)

const diagnosisIds = (
  diagnoses: ReadonlyArray<Finding>
): ReadonlyArray<string> => diagnoses.map((diagnosis) => diagnosis.detectorId)

test("imperative-state-manager fires on shared-state mutation density and suppresses the fallback", () => {
  const mutations = range(10).map((line) =>
    matchAt("no-mutation", "src/state/manager.ts", line, ["shared-state"])
  )
  const containers = [
    matchAt("prefer-hash-map", "src/state/manager.ts", 20),
    matchAt("prefer-hash-map", "src/state/manager.ts", 21)
  ]
  const interpretation = interpret([...mutations, ...containers])
  const ids = diagnosisIds(interpretation.advice)

  assert.deepEqual(ids, ["imperative-state-manager"])

  const diagnosis = interpretation.advice[0]
  assert.equal(diagnosis.path, "src/state/manager.ts")
  assert.equal(diagnosis.level, "file")

  const measures = diagnosis.evidence.map((item) => item.measure)
  assert.ok(measures.includes("no-mutation/shared-state"))
  assert.ok(measures.includes("prefer-hash-map"))
})

test("imperative-state-manager stays quiet below the shared-state threshold", () => {
  const mutations = range(7).map((line) =>
    matchAt("no-mutation", "src/state/manager.ts", line, ["shared-state"])
  )
  const interpretation = interpret(mutations)

  assert.deepEqual(interpretation.advice, [])
})

test("local-scope mutations do not count toward the state-manager trigger", () => {
  const mutations = range(10).map((line) =>
    matchAt("no-mutation", "src/fold.ts", line, ["local"])
  )
  const interpretation = interpret(mutations)
  const ids = diagnosisIds(interpretation.advice)

  assert.deepEqual(ids, ["high-match-density"])
})

test("high-match-density is the fallback for dense files without a specific diagnosis", () => {
  const matches = range(10).map((line) =>
    matchAt("no-throw", "src/hot.ts", line)
  )
  const interpretation = interpret(matches)
  const ids = diagnosisIds(interpretation.advice)

  assert.deepEqual(ids, ["high-match-density"])

  const measures = interpretation.advice[0].evidence.map((item) => item.measure)
  assert.deepEqual(measures, ["findings", "no-throw"])
  assert.equal(interpretation.advice[0].evidence[1].count, 10)
})

test("side-effect-laundering fires on repeated same-line collisions between rules", () => {
  const collisions = [
    matchAt("no-mutation", "src/useRun.ts", 153),
    matchAt("no-void-functions", "src/useRun.ts", 153),
    matchAt("no-mutation", "src/useRun.ts", 180),
    matchAt("no-void-functions", "src/useRun.ts", 180)
  ]
  const interpretation = interpret(collisions)
  const ids = diagnosisIds(interpretation.advice)

  assert.deepEqual(ids, ["side-effect-laundering"])

  const measures = interpretation.advice[0].evidence.map((item) => item.measure)
  assert.deepEqual(measures, [
    "line 153: no-mutation + no-void-functions",
    "line 180: no-mutation + no-void-functions"
  ])
})

test("a single dual-flagged line is not enough for side-effect-laundering", () => {
  const collision = [
    matchAt("no-mutation", "src/useRun.ts", 153),
    matchAt("no-void-functions", "src/useRun.ts", 153)
  ]
  const interpretation = interpret(collision)

  assert.deepEqual(interpretation.advice, [])
})

test("pipeline-hostile combines nested-call findings with the currying signal", () => {
  const nested = range(5).map((line) =>
    matchAt("no-nested-calls", "src/fold.ts", line)
  )
  const uncurried = range(5).map((line) =>
    matchAt("prefer-curried-data-last-functions", "src/fold.ts", line + 10)
  )
  const interpretation = interpret([...nested, ...uncurried])
  const ids = diagnosisIds(interpretation.advice)

  assert.deepEqual(ids, ["pipeline-hostile"])
})

test("signal matches never trigger density diagnoses on their own", () => {
  const signals = range(12).map((line) =>
    matchAt("prefer-curried-data-last-functions", "src/anywhere.ts", line)
  )
  const interpretation = interpret(signals)

  assert.deepEqual(interpretation.advice, [])
})

test("rule-dominance fires at project level for a widespread dominant rule", () => {
  const dominant = range(25).map((line) =>
    matchAt("no-throw", `pkg${line % 5}/src/file.ts`, line)
  )
  const rest = range(5).map((line) =>
    matchAt("no-mutation", "other/other.ts", line)
  )
  const interpretation = interpret([...dominant, ...rest])
  const ids = diagnosisIds(interpretation.advice)

  assert.deepEqual(ids, ["rule-dominance"])
  assert.equal(interpretation.advice[0].level, "project")

  const measures = interpretation.advice[0].evidence.map((item) => item.measure)
  assert.deepEqual(measures, ["findings", "no-throw"])
  assert.equal(interpretation.advice[0].evidence[1].count, 25)
})

test("hot-subsystem reports the deepest qualifying directory only", () => {
  const subsystem = range(27).map((line) =>
    matchAt("no-throw", `src/mcp/file${line % 3}.ts`, line)
  )
  const elsewhere = range(3).map((line) =>
    matchAt("no-mutation", "web/useRun.ts", line)
  )
  const interpretation = interpret([...subsystem, ...elsewhere])
  const directoryDiagnoses = interpretation.advice.filter(
    (diagnosis) => diagnosis.level === "directory"
  )

  assert.deepEqual(
    directoryDiagnoses.map((diagnosis) => diagnosis.path),
    ["src/mcp"]
  )
})

test("diagnoses sort file first, then directory, then project", () => {
  const subsystem = range(27).map((line) =>
    matchAt("no-throw", `src/mcp/file${line % 3}.ts`, line)
  )
  const dense = range(10).map((line) => matchAt("no-throw", "src/hot.ts", line))
  const interpretation = interpret([...subsystem, ...dense])
  const levels = interpretation.advice.map((diagnosis) => diagnosis.level)
  const sorted = [...levels].sort(
    (left, right) =>
      ["file", "directory", "project"].indexOf(left) -
      ["file", "directory", "project"].indexOf(right)
  )

  assert.deepEqual(levels, sorted)
})

test("systemic-hotspots fires one stratum above the advice it consumes", () => {
  const subsystem = range(36).map((line) =>
    matchAt("no-throw", `src/mcp/file${line % 3}.ts`, line)
  )
  const elsewhere = [matchAt("no-mutation", "web/useRun.ts", 1)]
  const interpretation = interpret([...subsystem, ...elsewhere])
  const ids = diagnosisIds(interpretation.advice)

  assert.ok(ids.includes("hot-subsystem"))
  assert.ok(ids.includes("high-match-density"))
  assert.ok(ids.includes("systemic-hotspots"))

  const systemic = interpretation.advice.filter(
    (item) => item.detectorId === "systemic-hotspots"
  )
  assert.equal(systemic[0].level, "project")

  const measures = systemic[0].evidence.map((item) => item.measure)
  assert.deepEqual(measures, ["hot-subsystem", "high-match-density"])
})

test("systemic-hotspots stays quiet when only the subsystem is hot", () => {
  const subsystem = range(27).map((line) =>
    matchAt("no-throw", `src/mcp/file${line % 3}.ts`, line)
  )
  const interpretation = interpret(subsystem)
  const ids = diagnosisIds(interpretation.advice)

  assert.ok(!ids.includes("systemic-hotspots"))
})
