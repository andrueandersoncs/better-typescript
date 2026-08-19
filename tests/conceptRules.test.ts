import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { kindOf } from "./conceptRuleKindOf.js"
import {
  conceptRuleNames,
  runConceptRulesIndependently,
  runFixture
} from "./runConceptRuleFixture.js"

type ConceptRuleName = (typeof conceptRuleNames)[number]

const conceptRuleHints: Readonly<Record<ConceptRuleName, string>> = {
  "closed-abstraction":
    "Collapse the function and its private data vocabulary into their external owner, reuse an existing concept, or deepen the Module until the abstraction has independent leverage. Do not replace the named model with an anonymous object type.",
  "duplicate-shape":
    "Reuse the existing data structure or merge the concepts. Keep a distinct representation only for an independently evolving boundary or invariant, and retain the duplicate evidence for review.",
  "function-derived-model":
    "Remove or deepen the function-data abstraction, or replace this structural-role name with an existing domain concept. A new name must mean more than input, output, options, context, state, or result for one function.",
  "missing-rationale":
    "Delete or reuse this concept before documenting it. If it remains, add one single-line comment directly above the declaration explaining because why existing concepts are insufficient. The prose does not suppress structural evidence.",
  "parameter-bag":
    "Remove or deepen the function seam, reuse existing domain values, or make this model a genuine command with independent semantics. Do not explode it into primitive parameters or an anonymous object type.",
  "pass-through-conversion":
    "Collapse the parallel representations or document and preserve the real boundary that requires both. A field-for-field adapter is evidence against introducing another first-party concept.",
  "redundant-alias":
    "Use Customer directly, merge the concepts, or add a real invariant or independently evolving boundary. Do not keep a second name only to describe structural use.",
  "speculative-export":
    "Remove the export and keep ownership local, or connect the model to an intentional public seam. Exporting a declaration does not establish reuse and must not evade abstraction analysis.",
  "unused-field":
    "Delete the speculative field or connect it to behavior that consumes its semantics. Mechanical forwarding into another representation is not a read and instead indicates parallel concepts."
}

const expectedConceptRuleRows: Readonly<
  Record<ConceptRuleName, ReadonlyArray<readonly [string, string, number, number]>>
> = {
  "closed-abstraction": [
    [
      "CalculateTotalInput and calculateTotal form a closed abstraction with at most one external owner.",
      "src/closed/data.ts",
      1,
      18
    ]
  ],
  "duplicate-shape": [
    [
      "WireIdentity duplicates the concrete structure of DomainIdentity.",
      "src/conversion/data.ts",
      1,
      18
    ],
    [
      "SecondaryAddress duplicates the concrete structure of PrimaryAddress.",
      "src/duplicate/data.ts",
      5,
      11
    ],
    [
      "SecondaryStatement duplicates the concrete structure of PrimaryStatement.",
      "src/duplicate/data.ts",
      13,
      6
    ],
    [
      "SecondaryBounds duplicates the concrete structure of PrimaryBounds.",
      "src/duplicate/data.ts",
      19,
      6
    ],
    [
      "SecondaryPair duplicates the concrete structure of PrimaryPair.",
      "src/duplicate/data.ts",
      23,
      6
    ],
    [
      "PrimaryDataError duplicates the concrete structure of PlainErrorPayload.",
      "src/v4/data.ts",
      11,
      14
    ],
    [
      "SecondaryDataError duplicates the concrete structure of PlainErrorPayload.",
      "src/v4/data.ts",
      15,
      14
    ],
    [
      "SecondarySchemaError duplicates the concrete structure of PrimarySchemaError.",
      "src/v4/data.ts",
      26,
      14
    ],
    [
      "SecondaryOpaque duplicates the concrete structure of PrimaryOpaque.",
      "src/v4/data.ts",
      37,
      14
    ],
    [
      "SecondaryExtended duplicates the concrete structure of PrimaryExtended.",
      "src/v4/data.ts",
      55,
      14
    ]
  ],
  "function-derived-model": [
    [
      "CalculateTotalInput is named after its sole function role instead of independent semantics.",
      "src/closed/data.ts",
      1,
      18
    ],
    [
      "RenderReceiptInput is named after its sole function role instead of independent semantics.",
      "src/derived/data.ts",
      1,
      18
    ]
  ],
  "missing-rationale": [
    [
      "CalculateTotalInput lacks a complete, structurally supported data-structure rationale.",
      "src/closed/data.ts",
      1,
      18
    ],
    [
      "WireIdentity lacks a complete, structurally supported data-structure rationale.",
      "src/conversion/data.ts",
      1,
      18
    ],
    [
      "DomainIdentity lacks a complete, structurally supported data-structure rationale.",
      "src/conversion/data.ts",
      5,
      18
    ],
    [
      "RenderReceiptInput lacks a complete, structurally supported data-structure rationale.",
      "src/derived/data.ts",
      1,
      18
    ],
    [
      "PrimaryAddress lacks a complete, structurally supported data-structure rationale.",
      "src/duplicate/data.ts",
      1,
      11
    ],
    [
      "SecondaryAddress lacks a complete, structurally supported data-structure rationale.",
      "src/duplicate/data.ts",
      5,
      11
    ],
    [
      "PrimaryStatement lacks a complete, structurally supported data-structure rationale.",
      "src/duplicate/data.ts",
      9,
      6
    ],
    [
      "SecondaryStatement lacks a complete, structurally supported data-structure rationale.",
      "src/duplicate/data.ts",
      13,
      6
    ],
    [
      "PrimaryBounds lacks a complete, structurally supported data-structure rationale.",
      "src/duplicate/data.ts",
      17,
      6
    ],
    [
      "SecondaryBounds lacks a complete, structurally supported data-structure rationale.",
      "src/duplicate/data.ts",
      19,
      6
    ],
    [
      "PrimaryPair lacks a complete, structurally supported data-structure rationale.",
      "src/duplicate/data.ts",
      21,
      6
    ],
    [
      "SecondaryPair lacks a complete, structurally supported data-structure rationale.",
      "src/duplicate/data.ts",
      23,
      6
    ],
    [
      "TaskCommand lacks a complete, structurally supported data-structure rationale.",
      "src/parameter/data.ts",
      1,
      18
    ],
    [
      "ApiPayload lacks a complete, structurally supported data-structure rationale.",
      "src/rationale/data.ts",
      1,
      18
    ],
    [
      "Customer lacks a complete, structurally supported data-structure rationale.",
      "src/redundant/data.ts",
      1,
      11
    ],
    [
      "CustomerData lacks a complete, structurally supported data-structure rationale.",
      "src/redundant/data.ts",
      5,
      6
    ],
    [
      "FutureSettlementProjection lacks a complete, structurally supported data-structure rationale.",
      "src/speculative/data.ts",
      1,
      18
    ],
    [
      "SharedDraft lacks a complete, structurally supported data-structure rationale.",
      "src/unused/data.ts",
      1,
      18
    ],
    [
      "PrimaryDataError lacks a complete, structurally supported data-structure rationale.",
      "src/v4/data.ts",
      11,
      14
    ],
    [
      "SecondaryDataError lacks a complete, structurally supported data-structure rationale.",
      "src/v4/data.ts",
      15,
      14
    ],
    [
      "PrimarySchemaError lacks a complete, structurally supported data-structure rationale.",
      "src/v4/data.ts",
      19,
      14
    ],
    [
      "SecondarySchemaError lacks a complete, structurally supported data-structure rationale.",
      "src/v4/data.ts",
      26,
      14
    ],
    [
      "PrimaryOpaque lacks a complete, structurally supported data-structure rationale.",
      "src/v4/data.ts",
      35,
      14
    ],
    [
      "SecondaryOpaque lacks a complete, structurally supported data-structure rationale.",
      "src/v4/data.ts",
      37,
      14
    ],
    [
      "PrimaryAsClass lacks a complete, structurally supported data-structure rationale.",
      "src/v4/data.ts",
      39,
      14
    ],
    [
      "SecondaryAsClass lacks a complete, structurally supported data-structure rationale.",
      "src/v4/data.ts",
      43,
      14
    ],
    [
      "BaseModel lacks a complete, structurally supported data-structure rationale.",
      "src/v4/data.ts",
      47,
      14
    ],
    [
      "PrimaryExtended lacks a complete, structurally supported data-structure rationale.",
      "src/v4/data.ts",
      51,
      14
    ],
    [
      "SecondaryExtended lacks a complete, structurally supported data-structure rationale.",
      "src/v4/data.ts",
      55,
      14
    ]
  ],
  "parameter-bag": [
    [
      "TaskCommand is constructed only to cross the runTask call seam.",
      "src/parameter/runTask.ts",
      7,
      11
    ],
    [
      "TaskCommand is constructed only to cross the runTask call seam.",
      "src/parameter/runTask.ts",
      10,
      11
    ]
  ],
  "pass-through-conversion": [
    [
      "toDomainIdentity copies WireIdentity into DomainIdentity without transformation.",
      "src/conversion/toDomain.ts",
      5,
      22
    ]
  ],
  "redundant-alias": [
    [
      "CustomerData renames Customer without adding independent semantics.",
      "src/redundant/data.ts",
      5,
      6
    ]
  ],
  "speculative-export": [
    [
      "FutureSettlementProjection is exported without an independent first-party consumer or established boundary.",
      "src/speculative/data.ts",
      1,
      18
    ]
  ],
  "unused-field": [
    [
      "PrimaryAddress.uniqueStreetName is constructed but never independently read.",
      "src/duplicate/data.ts",
      2,
      3
    ],
    [
      "SecondaryAddress.uniqueStreetName is constructed but never independently read.",
      "src/duplicate/data.ts",
      6,
      3
    ],
    [
      "PrimaryBounds.lowerBound is constructed but never independently read.",
      "src/duplicate/data.ts",
      17,
      24
    ],
    [
      "PrimaryBounds.upperBound is constructed but never independently read.",
      "src/duplicate/data.ts",
      17,
      58
    ],
    [
      "SecondaryBounds.upperBound is constructed but never independently read.",
      "src/duplicate/data.ts",
      19,
      26
    ],
    [
      "SecondaryBounds.lowerBound is constructed but never independently read.",
      "src/duplicate/data.ts",
      19,
      60
    ],
    ["PrimaryPair.0 is constructed but never independently read.", "src/duplicate/data.ts", 21, 6],
    ["PrimaryPair.1 is constructed but never independently read.", "src/duplicate/data.ts", 21, 6],
    [
      "PrimaryPair.length is constructed but never independently read.",
      "src/duplicate/data.ts",
      21,
      6
    ],
    [
      "SecondaryPair.0 is constructed but never independently read.",
      "src/duplicate/data.ts",
      23,
      6
    ],
    [
      "SecondaryPair.1 is constructed but never independently read.",
      "src/duplicate/data.ts",
      23,
      6
    ],
    [
      "SecondaryPair.length is constructed but never independently read.",
      "src/duplicate/data.ts",
      23,
      6
    ],
    [
      "Customer.customerIdentifier is constructed but never independently read.",
      "src/redundant/data.ts",
      2,
      3
    ],
    [
      "CustomerData.customerIdentifier is constructed but never independently read.",
      "src/redundant/data.ts",
      2,
      3
    ],
    [
      "FutureSettlementProjection.futureSettlementProjectionIdentifier is constructed but never independently read.",
      "src/speculative/data.ts",
      2,
      3
    ],
    [
      "SharedDraft.speculativeDraftForecast is constructed but never independently read.",
      "src/unused/data.ts",
      3,
      3
    ]
  ]
}

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

  const closedFamilyOverlap = violations
    .filter((violation) => violation.filePath === "src/closed/data.ts")
    .map(kindOf)

  assert.deepEqual(closedFamilyOverlap, [
    "closed-abstraction",
    "function-derived-model",
    "missing-rationale"
  ])

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

// ADR-0027 requires overlapping findings to remain visible when each Rule runs alone.
test("each public concept Rule reports its complete findings independently", async () => {
  const results = await runConceptRulesIndependently()

  const actual = results.map(({ rule, violations }) => ({
    ruleName: rule.name,
    violations: violations.map((violation, order) => ({ ...violation, order }))
  }))

  const expected = conceptRuleNames.map((ruleName) => ({
    ruleName,
    violations: expectedConceptRuleRows[ruleName].map(
      ([message, filePath, line, column], order) => ({
        ruleName,
        level: "error",
        message: `${message} ${conceptRuleHints[ruleName]}`,
        filePath,
        line,
        column,
        order
      })
    )
  }))

  assert.deepEqual(actual, expected)
})

test("individual concept rules recognize Effect data classes through observable findings", async () => {
  const violations = await runFixture()
  const summaries = violations
    .filter((violation) => violation.filePath === "src/v4/data.ts")
    .map((violation) => `${violation.line} ${kindOf(violation)} ${violation.message}`)

  const expectedSummaries = [
    "11 duplicate-shape PrimaryDataError duplicates the concrete structure of PlainErrorPayload.",
    "11 missing-rationale PrimaryDataError lacks a complete, structurally supported data-structure rationale.",
    "15 duplicate-shape SecondaryDataError duplicates the concrete structure of PlainErrorPayload.",
    "15 missing-rationale SecondaryDataError lacks a complete, structurally supported data-structure rationale.",
    "19 missing-rationale PrimarySchemaError lacks a complete, structurally supported data-structure rationale.",
    "26 duplicate-shape SecondarySchemaError duplicates the concrete structure of PrimarySchemaError.",
    "26 missing-rationale SecondarySchemaError lacks a complete, structurally supported data-structure rationale.",
    "35 missing-rationale PrimaryOpaque lacks a complete, structurally supported data-structure rationale.",
    "37 duplicate-shape SecondaryOpaque duplicates the concrete structure of PrimaryOpaque.",
    "37 missing-rationale SecondaryOpaque lacks a complete, structurally supported data-structure rationale.",
    "39 missing-rationale PrimaryAsClass lacks a complete, structurally supported data-structure rationale.",
    "43 missing-rationale SecondaryAsClass lacks a complete, structurally supported data-structure rationale.",
    "47 missing-rationale BaseModel lacks a complete, structurally supported data-structure rationale.",
    "51 missing-rationale PrimaryExtended lacks a complete, structurally supported data-structure rationale.",
    "55 duplicate-shape SecondaryExtended duplicates the concrete structure of PrimaryExtended.",
    "55 missing-rationale SecondaryExtended lacks a complete, structurally supported data-structure rationale."
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
