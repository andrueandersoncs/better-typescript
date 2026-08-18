import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { kindOf } from "./conceptRuleKindOf.js"
import { runFixture } from "./runConceptRuleFixture.js"

test("concept rules report structural concept debt before accepting rationale", async () => {
  const violations = await runFixture()
  const kinds = violations.map(kindOf)
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

  const details = violations.map(
    (violation) => `${violation.filePath}:${violation.line} ${kindOf(violation)}`
  )

  for (const expected of expectedKinds) {
    assert.ok(kinds.includes(expected), `missing ${expected}: ${details.join(", ")}`)
  }

  const allowedViolations = violations.filter((violation) =>
    violation.filePath.includes("src/allowed/")
  )

  assert.deepEqual(allowedViolations, [])

  const duplicateMessages = violations
    .filter((violation) => kindOf(violation) === "duplicate-shape")
    .map((violation) => violation.message)

  const expectedDuplicateMessages = [
    "SecondaryAddress duplicates the concrete structure of PrimaryAddress.",
    "SecondaryStatement duplicates the concrete structure of PrimaryStatement.",
    "SecondaryBounds duplicates the concrete structure of PrimaryBounds.",
    "SecondaryPair duplicates the concrete structure of PrimaryPair."
  ]

  for (const expected of expectedDuplicateMessages) {
    assert.ok(
      duplicateMessages.some((message) => message.startsWith(expected)),
      `missing duplicate message ${expected}: ${duplicateMessages.join(", ")}`
    )
  }
})

test("individual concept rules recognize Effect data classes through observable findings", async () => {
  const violations = await runFixture()
  const summaries = violations
    .filter((violation) => violation.filePath === "src/v4/data.ts")
    .map((violation) => `${violation.line} ${kindOf(violation)} ${violation.message}`)

  const expectedSummaries = [
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
  ]

  assert.equal(summaries.length, expectedSummaries.length)

  for (const expected of expectedSummaries) {
    assert.ok(
      summaries.some((summary) => summary.startsWith(expected)),
      `missing ${expected}`
    )
  }

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
