import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { Effect, Option, Schema, pipe, Array } from "effect"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { contextTagSeams } from "@better-typescript/checks/architectureExplore/contextTagSeams"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import { ContextTagSeamData } from "@better-typescript/checks/architectureExplore/data"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "architecture-evidence-seams")

const runFixture = async (namedCheck: NamedCheck): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectDetections = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(namedCheck.check))(project))
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

test("context-tag seams count adapters and consumers for Effect service keys", async () => {
  const detections = await runFixture(contextTagSeams)
  const payloads = detections.flatMap((item) =>
    Option.toArray(dataAs(Schema.is(ContextTagSeamData), item))
  )
  const byName = Object.fromEntries(payloads.map((data) => [data.serviceName, data] as const))

  const dead = byName["DeadSeam"]
  const consumed = byName["ConsumedSeam"]
  const twoAdapter = byName["TwoAdapterSeam"]

  assert.ok(dead)
  assert.ok(consumed)
  assert.ok(twoAdapter)

  assert.equal(dead.productionAdapterCount, 1)
  assert.equal(dead.testAdapterCount, 0)
  // DeadSeam stays at zero consumers because typePosition.ts only uses Layer.Layer<DeadSeam>
  assert.equal(dead.consumerCount, 0)

  assert.equal(consumed.productionAdapterCount, 1)
  assert.equal(consumed.testAdapterCount, 0)
  assert.ok(consumed.consumerCount >= 1)

  assert.equal(twoAdapter.productionAdapterCount, 1)
  assert.equal(twoAdapter.testAdapterCount, 1)

  assert.deepEqual(payloads.map((data) => data.serviceName).sort(), [
    "ConsumedSeam",
    "DeadSeam",
    "TwoAdapterSeam"
  ])
})
