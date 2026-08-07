import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Option, Schema } from "effect"
import { contextTagSeams } from "@better-typescript/guidance/preset/contextTagSeams"
import { ContextTagSeamData } from "@better-typescript/matchers/builtins/contextTagSeams"
import { runFixture } from "./architectureEvidenceSeamsFixture.js"
import { dataAs } from "./architectureEvidenceSeamsDataAs.js"

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
