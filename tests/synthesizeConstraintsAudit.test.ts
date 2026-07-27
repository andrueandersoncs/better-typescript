import * as assert from "node:assert/strict"
import { test } from "node:test"
import { auditDocument } from "../scripts/synthesizeConstraints/audit.ts"
import {
  Constraint,
  ConstraintDocument,
  Definition,
  type Finding
} from "../scripts/synthesizeConstraints/data.ts"
import { orderDefinitions } from "../scripts/synthesizeConstraints/order.ts"
import { renderDocument } from "../scripts/synthesizeConstraints/render.ts"
import { cleanDocument, violationClasses } from "./synthesizeConstraintsFixture.ts"

/** Audit the document exactly as the pipeline does: order, render, then check. */
const audit = (document: ConstraintDocument): ReadonlyArray<Finding> => {
  const ordering = orderDefinitions(document.definitions)
  const ordered = ConstraintDocument.make({ ...document, definitions: ordering.definitions })
  return auditDocument(ordered, renderDocument(ordered), ordering, violationClasses)
}

const withDefinitions = (
  document: ConstraintDocument,
  definitions: ReadonlyArray<Definition>
): ConstraintDocument => ConstraintDocument.make({ ...document, definitions })

const withConstraints = (
  document: ConstraintDocument,
  constraints: ReadonlyArray<Constraint>
): ConstraintDocument => ConstraintDocument.make({ ...document, constraints })

const withInformalDefinition = (
  document: ConstraintDocument,
  informalDefinition: string
): ConstraintDocument => ConstraintDocument.make({ ...document, informalDefinition })

const codes = (document: ConstraintDocument): ReadonlyArray<string> =>
  Array.from(new Set(audit(document).map((finding) => finding.code))).sort()

test("the clean fixture produces no findings", () => {
  assert.deepEqual(audit(cleanDocument()), [])
})

test("an enumerated item with no labelled example is reported", () => {
  const document = cleanDocument()
  const [first, ...rest] = document.definitions

  assert.deepEqual(
    codes(
      withDefinitions(document, [
        Definition.make({
          ...first!,
          enumeratedItems: [...first!.enumeratedItems, "resolved role"]
        }),
        ...rest
      ])
    ),
    ["D3"]
  )
})

test("a named contrary with no Not this example is reported", () => {
  const document = cleanDocument()
  const [first, ...rest] = document.definitions

  assert.deepEqual(
    codes(
      withDefinitions(document, [
        Definition.make({
          ...first!,
          contraries: ["a declaration file"],
          enumeratedItems: [...first!.enumeratedItems]
        }),
        ...rest
      ])
    ),
    ["D4"]
  )
})
test("a related-terms table without a comparison example is reported", () => {
  const document = cleanDocument()
  const [first, second] = document.definitions

  // The entry's own "This" example already demonstrates its enumerated item, so
  // removing the comparison example breaks the comparison obligation alone.
  assert.deepEqual(
    codes(
      withDefinitions(document, [first!, Definition.make({ ...second!, comparisonExamples: [] })])
    ),
    ["D5"]
  )
})

test("a predicate that states no Boolean result is reported", () => {
  const document = cleanDocument()
  const [first, ...rest] = document.definitions

  assert.deepEqual(
    codes(
      withDefinitions(document, [
        Definition.make({ ...first!, mechanicalPredicate: "Inspect the file thoroughly." }),
        ...rest
      ])
    ),
    ["D9"]
  )
})

test("a duplicate term is reported against the later entry", () => {
  const document = cleanDocument()
  const [first] = document.definitions
  const findings = audit(withDefinitions(document, [first!, Definition.make({ ...first! })]))

  assert.deepEqual(
    findings.filter((finding) => finding.code === "D6").map((finding) => finding.unit),
    ["definition/1"]
  )
})

test("a cyclic reference is reported against every entry in the cycle", () => {
  const document = cleanDocument()
  const [first, second] = document.definitions
  const findings = audit(
    withDefinitions(document, [
      Definition.make({ ...first!, dependsOn: ["Project source file"] }),
      second!
    ])
  )

  assert.deepEqual(
    findings
      .filter((finding) => finding.code === "D8")
      .map((finding) => finding.heading)
      .sort(),
    ["Project source file", "Source file"]
  )
})

test("a statement with no RFC 2119 keyword is reported", () => {
  const document = cleanDocument()
  const [first] = document.constraints

  assert.deepEqual(
    codes(
      withConstraints(document, [
        Constraint.make({ ...first!, statement: "Source files are placed under packages." })
      ])
    ),
    ["C1"]
  )
})

test("an escape hatch in a statement is reported", () => {
  const document = cleanDocument()
  const [first] = document.constraints

  assert.deepEqual(
    codes(
      withConstraints(document, [
        Constraint.make({
          ...first!,
          statement: `${first!.statement} Apply this rule where practical.`
        })
      ])
    ),
    ["C7"]
  )
})

test("identical allowed and violating examples are reported", () => {
  const document = cleanDocument()
  const [first] = document.constraints

  assert.deepEqual(
    codes(
      withConstraints(document, [
        Constraint.make({ ...first!, violatingExample: first!.allowedExample })
      ])
    ),
    ["C6"]
  )
})

test("coverage is audited in both directions", () => {
  const document = cleanDocument()
  const [first] = document.constraints

  assert.deepEqual(
    codes(withConstraints(document, [Constraint.make({ ...first!, violationClassIds: [] })])),
    ["C4"]
  )
  assert.deepEqual(
    codes(
      withConstraints(document, [
        Constraint.make({ ...first!, violationClassIds: ["invented-class"] })
      ])
    ),
    ["C4", "C5"]
  )
})

test("a prohibited subsection anywhere in the document is reported", () => {
  const document = cleanDocument()
  const [first] = document.constraints

  assert.deepEqual(
    codes(
      withConstraints(document, [
        Constraint.make({
          ...first!,
          rationale: `${first!.rationale}\n\n#### Exceptions\n\nNone.`
        })
      ])
    ),
    ["C3"]
  )
})

test("a normative requirement in the informal definition is reported", () => {
  assert.deepEqual(
    codes(
      withInformalDefinition(
        cleanDocument(),
        "Every file MUST be addressable from its package layout."
      )
    ),
    ["S3"]
  )
})

test("a link to a heading that does not exist is reported", () => {
  const document = cleanDocument()
  const [first, ...rest] = document.definitions

  assert.deepEqual(
    codes(
      withDefinitions(document, [
        Definition.make({ ...first!, prose: `${first!.prose} See [the role](#module-role).` }),
        ...rest
      ])
    ),
    ["L1"]
  )
})
