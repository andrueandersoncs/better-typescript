import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { kindOf } from "./conceptControlKindOf.js"
import { runFixture } from "./conceptControlRunFixture.js"

test("concept-control reports structural concept debt before accepting rationale", async () => {
  const signals = await runFixture()
  const kinds = signals.map(kindOf)
  const expectedKinds = [
    "closed-abstraction",
    "duplicate-shape",
    "function-derived-model",
    "missing-rationale",
    "parameter-bag",
    "pass-through-conversion",
    "redundant-alias",
    "speculative-export",
    "unused-field"
  ]

  const details = signals.map(
    (signal) => `${signal.location.path}:${signal.location.line} ${kindOf(signal)}`
  )

  for (const expected of expectedKinds) {
    assert.ok(kinds.includes(expected), `missing ${expected}: ${details.join(", ")}`)
  }

  const allowedSignals = signals.filter((signal) => signal.location.path.includes("src/allowed/"))

  assert.deepEqual(allowedSignals, [])

  const duplicateMessages = signals
    .filter((signal) => kindOf(signal) === "duplicate-shape")
    .map((signal) => signal.message)

  const expectedDuplicateMessages = [
    "SecondaryAddress duplicates the concrete structure of PrimaryAddress.",
    "SecondaryStatement duplicates the concrete structure of PrimaryStatement.",
    "SecondaryBounds duplicates the concrete structure of PrimaryBounds.",
    "SecondaryPair duplicates the concrete structure of PrimaryPair."
  ]

  for (const expected of expectedDuplicateMessages) {
    assert.ok(
      duplicateMessages.includes(expected),
      `missing duplicate message ${expected}: ${duplicateMessages.join(", ")}`
    )
  }
})

test("concept matcher recognizes Effect data classes through observable findings", async () => {
  const signals = await runFixture()
  const summaries = signals
    .filter((signal) => signal.location.path === "src/v4/data.ts")
    .map((signal) => `${signal.location.line} ${kindOf(signal)} ${signal.message}`)

  assert.deepEqual(summaries, [
    "11 duplicate-shape PrimaryDataError duplicates the concrete structure of PlainErrorPayload.",
    "15 duplicate-shape SecondaryDataError duplicates the concrete structure of PlainErrorPayload.",
    "26 duplicate-shape SecondarySchemaError duplicates the concrete structure of PrimarySchemaError.",
    "37 duplicate-shape SecondaryOpaque duplicates the concrete structure of PrimaryOpaque.",
    "55 duplicate-shape SecondaryExtended duplicates the concrete structure of PrimaryExtended.",
    "19 missing-rationale PrimarySchemaError lacks a complete, structurally supported data-structure rationale.",
    "35 missing-rationale PrimaryOpaque lacks a complete, structurally supported data-structure rationale.",
    "39 missing-rationale PrimaryAsClass lacks a complete, structurally supported data-structure rationale.",
    "43 missing-rationale SecondaryAsClass lacks a complete, structurally supported data-structure rationale.",
    "47 missing-rationale BaseModel lacks a complete, structurally supported data-structure rationale.",
    "51 missing-rationale PrimaryExtended lacks a complete, structurally supported data-structure rationale."
  ])

  assert.equal(
    summaries.some((summary) => summary.includes("FakePrimary")),
    false
  )
  assert.equal(
    summaries.some((summary) => summary.includes("FakeSecondary")),
    false
  )
  assert.equal(
    summaries.some((summary) => summary.includes("unused-field")),
    false
  )
  assert.equal(
    summaries.some((summary) => summary.includes("speculative-export")),
    false
  )
})
