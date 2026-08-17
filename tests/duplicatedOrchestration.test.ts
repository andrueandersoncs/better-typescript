import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Option, Schema, pipe } from "effect"
import { compositionFingerprints } from "@better-typescript/guidance/preset/compositionFingerprints"
import { duplicatedOrchestration } from "@better-typescript/guidance/architectureExplore/architectureExploreModuleShapeAdvisers"
import { CompositionFingerprintData } from "@better-typescript/matchers/builtins/compositionFingerprints"
import { runFixture } from "./duplicatedOrchestrationFixture.js"
import { dataAs } from "./duplicatedOrchestrationDataAs.js"
import { fingerprintData } from "./duplicatedOrchestrationFingerprintData.js"
import { namedFingerprint } from "./duplicatedOrchestrationNamedFingerprint.js"

test("composition fingerprints match across clones and skip sub-threshold exports", async () => {
  const detections = await runFixture(compositionFingerprints)
  const byPath = new Map(detections.map((item) => [item.location.path, item] as const))

  const cloneA = pipe(
    Option.fromNullishOr(byPath.get("src/cloneA.ts")),
    Option.flatMap((item) => dataAs(Schema.is(CompositionFingerprintData), item)),
    Option.getOrThrow
  )
  const cloneB = pipe(
    Option.fromNullishOr(byPath.get("src/cloneB.ts")),
    Option.flatMap((item) => dataAs(Schema.is(CompositionFingerprintData), item)),
    Option.getOrThrow
  )
  const different = pipe(
    Option.fromNullishOr(byPath.get("src/different.ts")),
    Option.flatMap((item) => dataAs(Schema.is(CompositionFingerprintData), item)),
    Option.getOrThrow
  )

  assert.equal(cloneA.fingerprint, "pipe>stageOne>stageTwo>stageThree")
  assert.equal(cloneA.stepCount, 4)
  assert.equal(cloneA.exportName, "runCloneA")
  assert.equal(cloneB.fingerprint, cloneA.fingerprint)
  assert.equal(cloneB.stepCount, cloneA.stepCount)
  assert.equal(different.fingerprint, "pipe>otherOne>otherTwo>otherThree")
  assert.notEqual(different.fingerprint, cloneA.fingerprint)
  assert.equal(byPath.has("src/shallow.ts"), false)
})

test("duplicated orchestration fires for shared fingerprints across files", () => {
  const shared = fingerprintData("pipe>stageOne>stageTwo>stageThree", 4, "runCloneA")
  const advice = duplicatedOrchestration([
    namedFingerprint("src/cloneA.ts", 4, shared),
    namedFingerprint("src/cloneB.ts", 4, fingerprintData(shared.fingerprint, 4, "runCloneB"))
  ])

  assert.equal(advice.length, 1)
  assert.equal(advice[0]?.title, "duplicated orchestration")
  assert.equal(advice[0]?.level, "directory")
  assert.equal(advice[0]?.location.path, "src")
  assert.deepEqual(
    advice[0]?.evidence.map((item) => [item.measure, item.count]),
    [
      ["duplicate-sites", 2],
      ["orchestration-steps", 4]
    ]
  )
})

test("duplicated orchestration stays silent for one site or distinct fingerprints", () => {
  const shared = fingerprintData("pipe>stageOne>stageTwo>stageThree", 4, "runCloneA")
  const other = fingerprintData("pipe>otherOne>otherTwo>otherThree", 4, "runDifferent")

  const singleSite = duplicatedOrchestration([namedFingerprint("src/cloneA.ts", 4, shared)])
  const distinct = duplicatedOrchestration([
    namedFingerprint("src/cloneA.ts", 4, shared),
    namedFingerprint("src/different.ts", 4, other)
  ])

  assert.equal(singleSite.length, 0)
  assert.equal(distinct.length, 0)
})

test("duplicated orchestration does not combine matching fingerprints across projects", () => {
  const fingerprint = "pipe>stageOne>stageTwo>stageThree"
  const alpha = fingerprintData(fingerprint, 4, "runAlpha", "alpha")
  const beta = fingerprintData(fingerprint, 4, "runBeta", "beta")
  const advice = duplicatedOrchestration([
    namedFingerprint("src/clone.ts", 4, alpha),
    namedFingerprint("src/clone.ts", 4, beta)
  ])

  assert.equal(advice.length, 0)
})
