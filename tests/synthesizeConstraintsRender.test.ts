import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"
import { test } from "node:test"
import { Effect } from "effect"
import {
  Constraint,
  ConstraintDocument,
  Definition,
  Example,
  type CodeFence,
  type Finding
} from "../scripts/synthesizeConstraints/data.ts"
import { codeFences, stripFences } from "../scripts/synthesizeConstraints/fence.ts"
import { orderDefinitions } from "../scripts/synthesizeConstraints/order.ts"
import { renderDocument } from "../scripts/synthesizeConstraints/render.ts"
import { checkFences } from "../scripts/synthesizeConstraints/typecheck.ts"
import { cleanDocument } from "./synthesizeConstraintsFixture.ts"

const withDefinitions = (
  document: ConstraintDocument,
  definitions: ReadonlyArray<Definition>
): ConstraintDocument => ConstraintDocument.make({ ...document, definitions })

const withConstraints = (
  document: ConstraintDocument,
  constraints: ReadonlyArray<Constraint>
): ConstraintDocument => ConstraintDocument.make({ ...document, constraints })

/** Override the first constraint's fields, the way every fence test varies one snippet. */
const withFirstConstraint = (fields: Partial<Constraint>): ConstraintDocument => {
  const document = cleanDocument()
  const [first] = document.constraints
  return withConstraints(document, [Constraint.make({ ...first!, ...fields })])
}

const rendered = (): string => {
  const document = cleanDocument()
  const ordering = orderDefinitions(document.definitions)
  return renderDocument(withDefinitions(document, ordering.definitions))
}

const scratch = (name: string): string => path.join(".cache", "synthesize-constraints-tests", name)

const check = (fences: ReadonlyArray<CodeFence>, directory: string): ReadonlyArray<Finding> =>
  Effect.runSync(checkFences(directory)(fences))

test("the required sections render exactly once in the required order", () => {
  const markdown = rendered()
  const headings = Array.from(
    stripFences(markdown).matchAll(/^#{1,2}[ \t]+(.+?)[ \t]*$/gmu),
    (match) => match[1]
  )

  assert.deepEqual(headings, [
    "Addressable source placement constraints",
    "Informal definition",
    "Definitions",
    "Constraints"
  ])
})

test("constraints are numbered by position rather than by the drafting stage", () => {
  const document = cleanDocument()
  const [only] = document.constraints
  const markdown = renderDocument(
    withConstraints(document, [
      Constraint.make({ ...only!, title: "First subject" }),
      Constraint.make({ ...only!, title: "Second subject" })
    ])
  )

  assert.match(markdown, /^### 1\. First subject$/mu)
  assert.match(markdown, /^### 2\. Second subject$/mu)
})

test("every required constraint subsection and label is emitted", () => {
  const markdown = rendered()

  for (const marker of [
    "#### Property protected",
    "#### Rationale",
    "**Verification:**",
    "**Verification implementation:**",
    "**Allowed:**",
    "**Violating:**"
  ]) {
    assert.ok(markdown.includes(marker), `missing ${marker}`)
  }
})

test("a related-terms table renders with the required columns", () => {
  const markdown = rendered()

  assert.ok(markdown.includes("#### Related terms"))
  assert.ok(
    markdown.includes(
      "| Term | Relation | Deciding distinction | Why it is not interchangeable here |"
    )
  )
})

test("a contrary case renders as a labelled This and Not this pair", () => {
  const markdown = rendered()

  assert.ok(markdown.includes("**This:**"))
  assert.ok(markdown.includes("**Not this:**"))
})

test("the informal definition carries no requirement, predicate, or fence", () => {
  const markdown = rendered()
  const informal = markdown.split("## Definitions")[0]?.split("## Informal definition")[1] ?? ""

  assert.doesNotMatch(informal, /\bMUST\b/u)
  assert.doesNotMatch(informal, /Mechanical predicate/u)
  assert.ok(!informal.includes("```"))
})

test("every prose use of a defined term renders as a link to its entry", () => {
  const markdown = rendered()
  const constraints = markdown.split("## Constraints")[1] ?? ""

  assert.ok(constraints.includes("[project source file](#project-source-file)"))
})

test("fences are attributed to the entry and field that produced them", () => {
  const fences = codeFences(cleanDocument())
  const ids = fences.map((entry) => entry.id)

  assert.ok(ids.includes("definition/0/predicateImplementation"))
  assert.ok(ids.includes("definition/1/comparisonExample"))
  assert.ok(ids.includes("constraint/0/violatingExample"))
  assert.deepEqual(
    fences.filter((entry) => entry.id === "constraint/0/allowedExample").map((it) => it.heading),
    ["Source placement"]
  )
})

test("stripping fences preserves line count so prose line numbers stay usable", () => {
  const markdown = rendered()

  assert.equal(stripFences(markdown).split("\n").length, markdown.split("\n").length)
  assert.ok(!stripFences(markdown).includes("```"))
})

test("the fixture's snippets all type-check independently", () => {
  const directory = scratch("clean")
  const findings = check(codeFences(cleanDocument()), directory)

  assert.deepEqual(findings, [])
  fs.rmSync(directory, { recursive: true, force: true })
})

test("a snippet that does not type-check is reported against its own field", () => {
  const broken = withFirstConstraint({
    allowedExample: 'export const count: number = "not a number"'
  })

  const directory = scratch("broken")
  const findings = check(codeFences(broken), directory)

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.code, "T1")
  assert.equal(findings[0]?.unit, "constraint/0")
  assert.equal(findings[0]?.heading, "Source placement")
  assert.match(findings[0]?.message ?? "", /^allowedExample line \d+: TS2322/u)
  fs.rmSync(directory, { recursive: true, force: true })
})

test("snippets are checked independently, so two may declare the same name", () => {
  const shared = "export const value: number = 1"
  const colliding = withFirstConstraint({
    allowedExample: shared,
    violatingExample: `${shared} + 0`
  })

  const directory = scratch("independent")
  const findings = check(codeFences(colliding), directory)

  assert.deepEqual(
    findings.filter((finding) => finding.message.includes("Cannot redeclare")),
    []
  )
  fs.rmSync(directory, { recursive: true, force: true })
})

test("a relative import resolves to a synthesized neighbour so import edges are showable", () => {
  const withEdge = withFirstConstraint({
    allowedExample: [
      'import { normalize } from "./neighbour.js"',
      "",
      "export const format = (value: string): unknown => normalize(value)"
    ].join("\n")
  })

  const directory = scratch("siblings")
  const findings = check(codeFences(withEdge), directory)

  assert.deepEqual(findings, [])
  fs.rmSync(directory, { recursive: true, force: true })
})

test("an extensionless relative import stays a finding under NodeNext", () => {
  const withoutExtension = withFirstConstraint({
    allowedExample: [
      'import { normalize } from "./neighbour"',
      "",
      "export const format = (value: string): unknown => normalize(value)"
    ].join("\n")
  })

  const directory = scratch("extensionless")
  const findings = check(codeFences(withoutExtension), directory)

  assert.equal(findings.length, 1)
  // Synthesizing the neighbour lets the compiler name the fix, so the finding
  // arrives as TS2835 with a suggestion rather than the bare TS2834.
  assert.match(findings[0]?.message ?? "", /TS2835.*Did you mean '\.\/neighbour\.js'/u)
  fs.rmSync(directory, { recursive: true, force: true })
})

test("one snippet's synthesized neighbour never satisfies another's import", () => {
  const shared = withFirstConstraint({
    allowedExample: [
      'import { normalize } from "./neighbour.js"',
      "export const allowed = normalize"
    ].join("\n"),
    violatingExample: [
      'import { widen } from "./neighbour.js"',
      "export const violating = widen"
    ].join("\n")
  })

  const directory = scratch("isolated-siblings")
  const findings = check(codeFences(shared), directory)

  // Each fence owns a directory, so its neighbour declares only the names that
  // fence imports; a shared directory would let one fence satisfy the other.
  assert.deepEqual(findings, [])

  const allowed = path.join(directory, "constraint_0_allowedExample", "neighbour.ts")
  const violating = path.join(directory, "constraint_0_violatingExample", "neighbour.ts")

  assert.match(fs.readFileSync(allowed, "utf8"), /normalize/u)
  assert.doesNotMatch(fs.readFileSync(allowed, "utf8"), /widen/u)
  assert.match(fs.readFileSync(violating, "utf8"), /widen/u)

  fs.rmSync(directory, { recursive: true, force: true })
})

test("a named re-export resolves like an import, because it states the same edge", () => {
  const reExport = withFirstConstraint({
    allowedExample: 'export { parseValue } from "./parser.js"'
  })

  const directory = scratch("re-export")

  assert.deepEqual(check(codeFences(reExport), directory), [])
  fs.rmSync(directory, { recursive: true, force: true })
})

test("an uninstalled package specifier is declared so subpath rules are showable", () => {
  const subpath = withFirstConstraint({
    allowedExample: ['import { sum } from "my-package/math"', "export const total = sum"].join("\n")
  })

  const directory = scratch("subpath")

  assert.deepEqual(check(codeFences(subpath), directory), [])
  fs.rmSync(directory, { recursive: true, force: true })
})

test("an installed package is still checked for real rather than declared away", () => {
  const wrongUse = withFirstConstraint({
    allowedExample: [
      'import * as ts from "typescript"',
      "",
      "export const target: string = ts.ScriptTarget.ES2022"
    ].join("\n")
  })

  const directory = scratch("installed")
  const findings = check(codeFences(wrongUse), directory)

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? "", /TS2322/u)
  fs.rmSync(directory, { recursive: true, force: true })
})

test("an arbitrary-extension import resolves through a matching declaration", () => {
  const dataImport = withFirstConstraint({
    allowedExample: ['import rows from "./data.csv"', "export const first = rows"].join("\n")
  })

  const directory = scratch("arbitrary-extension")

  assert.deepEqual(check(codeFences(dataImport), directory), [])
  fs.rmSync(directory, { recursive: true, force: true })
})

test("a dynamic import resolves, covering the fourth specifier position", () => {
  const dynamic = withFirstConstraint({
    allowedExample: [
      'const loaded = await import("./source.js")',
      "",
      "export const count: unknown = loaded.default"
    ].join("\n")
  })

  const directory = scratch("dynamic-import")

  assert.deepEqual(check(codeFences(dynamic), directory), [])
  fs.rmSync(directory, { recursive: true, force: true })
})

test("related-terms rows begin and end with a pipe, matching the header", () => {
  const rows = rendered()
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("Relation"))

  assert.equal(rows.length, 1)
  assert.match(rows[0] ?? "", /^\| .* \|$/u)
})

test("the comparison example renders unlabelled, so no This promises a missing Not this", () => {
  const document = cleanDocument()
  const [first, second] = document.definitions
  const comparison = Example.make({ ...second!.comparisonExamples[0]!, label: "this" })
  const relabelled = Definition.make({ ...second!, comparisonExamples: [comparison] })
  const labelledComparison = withDefinitions(document, [first!, relabelled])

  const table = renderDocument(labelledComparison).split("#### Related terms")[1] ?? ""
  const untilExamples = table.split("**Mechanical predicate:**")[0] ?? ""

  assert.ok(!untilExamples.includes("**This:**"))
})
