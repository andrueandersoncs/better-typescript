import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Option, Schema } from "effect"
import { compositionForwarders } from "@better-typescript/guidance/preset/compositionForwarders"
import { moduleScopeEffects } from "@better-typescript/guidance/preset/moduleScopeEffects"
import { CompositionForwarderData } from "@better-typescript/matchers/builtins/compositionForwarders"
import { ModuleScopeEffectData } from "@better-typescript/matchers/builtins/moduleScopeEffectData"
import { runFixture } from "./architectureEvidenceFpFixture.js"
import { dataAs } from "./architectureEvidenceFpDataAs.js"

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
