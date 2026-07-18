import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { Effect, Option, Schema, pipe, Array } from "effect"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { compositionForwarders } from "@better-typescript/checks/architectureExplore/compositionForwarders"
import { moduleScopeEffects } from "@better-typescript/checks/architectureExplore/moduleScopeEffects"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import {
  CompositionForwarderData,
  ModuleScopeEffectData
} from "@better-typescript/checks/architectureExplore/data"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "architecture-evidence-fp")

const runFixture = async (named: NamedCheck): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectDetections = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(named.check))(project))
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

test("composition forwarders detect curried pipe wrappers and record caller leverage", async () => {
  const detections = await runFixture(compositionForwarders)
  const payloads = detections.flatMap((item) =>
    Option.toArray(dataAs(Schema.is(CompositionForwarderData), item))
  )
  const normalize = payloads.find((data) => data.exportName === "normalize")

  assert.ok(normalize)
  assert.equal(normalize.stepCount, 2)
  assert.equal(normalize.callerCount, 1)
  assert.deepEqual(normalize.callerPaths, ["src/compositionForwardersCaller.ts"])
  assert.equal(normalize.hasNonCallReference, false)

  assert.equal(
    payloads.some((data) => data.exportName === "labeled"),
    false
  )
  assert.equal(
    payloads.some((data) => data.exportName === "increment"),
    false
  )
  assert.equal(
    payloads.some((data) => data.exportName === "formatLocally"),
    false
  )
  assert.equal(
    detections.some((item) => item.location.path.startsWith("tests/")),
    false
  )
})

test("module-scope effects classify io and Effect.run while skipping roots and tests", async () => {
  const detections = await runFixture(moduleScopeEffects)
  const payloads = detections.flatMap((item) =>
    Option.toArray(dataAs(Schema.is(ModuleScopeEffectData), item))
  )

  const moduleScopeIo = payloads.filter((data) => data.kind === "module-scope-io")
  const effectRuns = payloads.filter((data) => data.kind === "effect-run")

  assert.equal(moduleScopeIo.length, 1)
  assert.equal(moduleScopeIo[0]?.calleeText, "readFileSync")

  assert.equal(effectRuns.length, 1)
  assert.equal(effectRuns[0]?.calleeText, "Effect.runSync")

  assert.equal(
    detections.some((item) => item.location.path === "src/wiring.ts"),
    false
  )
  assert.equal(
    detections.some((item) => item.location.path.startsWith("tests/")),
    false
  )
})
