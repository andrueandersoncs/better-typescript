import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { Array, Effect, Option, Schema, Stream, pipe } from "effect"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { Detection as DetectionData } from "@better-typescript/core/engine/location/data"
import { Location } from "@better-typescript/core/engine/location/data"
import type { Advice } from "@better-typescript/core/engine/derive/data"
import { NamedDetection } from "@better-typescript/core/engine/derive/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import { compositionFingerprints } from "@better-typescript/checks/architectureExplore/compositionFingerprints"
import { duplicatedOrchestration } from "@better-typescript/checks/architectureExplore/duplicatedOrchestration"
import { CompositionFingerprintData } from "@better-typescript/checks/architectureExplore/data"
import { compositionFingerprintsName } from "@better-typescript/checks/architectureExplore/names"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "architecture-evidence-orchestration")

const runFixture = async (check: Check): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectDetections = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(check))(project))
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

const fingerprintData = (
  fingerprint: string,
  stepCount: number,
  exportName: string
): CompositionFingerprintData =>
  new CompositionFingerprintData({ fingerprint, stepCount, exportName })

const detectionAt = (filePath: string, line: number, data: CompositionFingerprintData): Detection =>
  new DetectionData({
    location: new Location({ path: filePath, line, column: 1 }),
    message: "message",
    hint: "hint",
    data
  })

const namedFingerprint = (
  filePath: string,
  line: number,
  data: CompositionFingerprintData
): NamedDetection =>
  new NamedDetection({
    name: compositionFingerprintsName,
    detection: detectionAt(filePath, line, data)
  })

const collectAdvice = (advice: Stream.Stream<Advice>): Promise<ReadonlyArray<Advice>> =>
  Effect.runPromise(Stream.runCollect(advice))

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

test("duplicated orchestration fires for shared fingerprints across files", async () => {
  const shared = fingerprintData("pipe>stageOne>stageTwo>stageThree", 4, "runCloneA")
  const advice = await collectAdvice(
    duplicatedOrchestration(
      Stream.fromIterable([
        namedFingerprint("src/cloneA.ts", 4, shared),
        namedFingerprint("src/cloneB.ts", 4, fingerprintData(shared.fingerprint, 4, "runCloneB"))
      ])
    )
  )

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

test("duplicated orchestration stays silent for one site or distinct fingerprints", async () => {
  const shared = fingerprintData("pipe>stageOne>stageTwo>stageThree", 4, "runCloneA")
  const other = fingerprintData("pipe>otherOne>otherTwo>otherThree", 4, "runDifferent")

  const singleSite = await collectAdvice(
    duplicatedOrchestration(Stream.fromIterable([namedFingerprint("src/cloneA.ts", 4, shared)]))
  )
  const distinct = await collectAdvice(
    duplicatedOrchestration(
      Stream.fromIterable([
        namedFingerprint("src/cloneA.ts", 4, shared),
        namedFingerprint("src/different.ts", 4, other)
      ])
    )
  )

  assert.equal(singleSite.length, 0)
  assert.equal(distinct.length, 0)
})
