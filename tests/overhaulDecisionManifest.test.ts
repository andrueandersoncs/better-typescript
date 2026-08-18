import * as assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "bun:test"
import { Array, Order, Schema, pipe } from "effect"
import { expectedDefaultRuleNames } from "./overhaulExpectedDefaultRuleNames.js"
import { expectedEffectQualityRuleNames } from "./overhaulExpectedEffectQualityRuleNames.js"
import { expectedRuleNames } from "./overhaulExpectedTargetRuleNames.js"

test("overhaul decisions are complete and derive the approved rule catalog", () => {
  const Decision = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    type: Schema.Literals(["guidance", "matcher"]),
    lifecycle: Schema.String,
    fleet: Schema.String,
    level: Schema.String,
    choice: Schema.Literals(["keep", "change", "discard"]),
    changes: Schema.String
  })
  const Manifest = Schema.Struct({
    inventory: Schema.String,
    decisions: Schema.Array(Decision)
  })
  const manifestPath = new URL("../better-typescript-overhaul-decisions.json", import.meta.url)
  const manifestText = readFileSync(manifestPath, "utf8")
  const manifest = Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(manifestText)
  const selectedDecisions = Array.filter(
    manifest.decisions,
    ({ choice }) => choice === "keep" || choice === "change"
  )
  const selectedNamesForFleet = (fleet: string): ReadonlyArray<string> =>
    pipe(
      selectedDecisions,
      Array.filter((decision) => decision.fleet === fleet),
      Array.map(({ name }) => name),
      Array.dedupe,
      Array.sort(Order.String)
    )
  const selectedNames = pipe(
    selectedDecisions,
    Array.map(({ name }) => name),
    Array.dedupe,
    Array.sort(Order.String)
  )
  const selectedDefaultNames = selectedNamesForFleet("default")
  const selectedEffectQualityNames = selectedNamesForFleet("effect-quality")
  const sharedNames = Array.intersection(selectedDefaultNames, selectedEffectQualityNames)
  const decisionIds = Array.map(manifest.decisions, ({ id }) => id)
  const changeDecisions = Array.filter(manifest.decisions, ({ choice }) => choice === "change")

  assert.equal(manifest.inventory, "better-typescript-overhaul")
  assert.equal(manifest.decisions.length, 281)
  assert.equal(Array.dedupe(decisionIds).length, 281)
  assert.equal(
    Array.every(changeDecisions, ({ changes }) => changes.trim().length > 0),
    true
  )
  assert.deepEqual(selectedDefaultNames, expectedDefaultRuleNames)
  assert.deepEqual(selectedEffectQualityNames, expectedEffectQualityRuleNames)
  assert.deepEqual(sharedNames, ["process-environment"])
  assert.deepEqual(selectedNames, expectedRuleNames)
  assert.equal(selectedNames.length, 126)
})
