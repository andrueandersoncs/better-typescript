import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "node:test"
import { Effect, Option, Result } from "effect"
import { assignAnchors, slugify, termAnchors } from "../scripts/synthesizeConstraints/anchor.ts"
import { resolveConcept } from "../scripts/synthesizeConstraints/concept.ts"
import { Definition } from "../scripts/synthesizeConstraints/data.ts"
import { linkTerms, unlinkedTerms } from "../scripts/synthesizeConstraints/link.ts"
import { orderDefinitions } from "../scripts/synthesizeConstraints/order.ts"
import { projectSourceFile, sourceFile } from "./synthesizeConstraintsFixture.ts"

const conceptFor = (argument: string) => Effect.runSync(resolveConcept("docs")(argument))

const stub = (term: string, dependsOn: ReadonlyArray<string>): Definition =>
  Definition.make({ ...sourceFile, term, dependsOn })

test("heading anchors drop punctuation and hyphenate whitespace", () => {
  assert.equal(slugify("Project source file"), "project-source-file")
  assert.equal(slugify("1. Source placement and filename"), "1-source-placement-and-filename")
  assert.equal(slugify("Effect's `Layer` seam"), "effects-layer-seam")
})

test("repeated headings receive GitHub's numeric suffixes", () => {
  assert.deepEqual(assignAnchors(["Role", "Role", "Role"]), ["role", "role-1", "role-2"])
})

test("a concept argument fixes the title, slug, and output pathname", () => {
  const concept = conceptFor("TypeScript code modularity with Effect")

  assert.equal(concept.title, "TypeScript code modularity with Effect constraints")
  assert.equal(concept.slug, "typescript-code-modularity-with-effect")
  assert.equal(
    concept.outputPath,
    path.join("docs", "typescript-code-modularity-with-effect-constraints.md")
  )
})

test("an @document argument takes its concept from the first heading", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "synthesize-"))
  const documentPath = path.join(directory, "goal.md")
  fs.writeFileSync(documentPath, "# Deterministic report ordering\n\nBody text.\n", "utf8")

  const concept = conceptFor(`@${documentPath}`)

  assert.equal(concept.name, "Deterministic report ordering")
  assert.equal(concept.slug, "deterministic-report-ordering")
  assert.ok(concept.request.includes("Body text."))

  fs.rmSync(directory, { recursive: true, force: true })
})

test("an empty argument is rejected rather than defaulted", () => {
  const outcome = Effect.runSync(Effect.result(resolveConcept("docs")("   ")))

  assert.ok(Result.isFailure(outcome))
  assert.match(outcome.failure.message, /concept, goal, or @document/u)
})

test("prerequisite entries are ordered before the entries that rely on them", () => {
  const ordering = orderDefinitions([projectSourceFile, sourceFile])

  assert.deepEqual(
    ordering.definitions.map((definition) => definition.term),
    ["Source file", "Project source file"]
  )
  assert.deepEqual(ordering.cycles, [])
  assert.deepEqual(ordering.unknownReferences, [])
})

test("ordering keeps the proposed sequence wherever the graph permits it", () => {
  const ordering = orderDefinitions([stub("Alpha", []), stub("Beta", []), stub("Gamma", [])])

  assert.deepEqual(
    ordering.definitions.map((definition) => definition.term),
    ["Alpha", "Beta", "Gamma"]
  )
})

test("a reference cycle is named rather than silently broken", () => {
  const ordering = orderDefinitions([stub("Alpha", ["Beta"]), stub("Beta", ["Alpha"])])

  assert.deepEqual(ordering.cycles, [["Alpha", "Beta"]])
  assert.equal(ordering.definitions.length, 2)
})

test("a reference to an undefined term is reported", () => {
  const ordering = orderDefinitions([stub("Alpha", ["Nowhere"])])

  assert.deepEqual(ordering.unknownReferences, ["Nowhere"])
})

const anchors = termAnchors(["Source file", "Project source file", "Module role"])
const link = linkTerms(anchors, Option.none())
const unlinked = unlinkedTerms(anchors, Option.none())

test("the longest matching term wins so a narrowing term is not shadowed", () => {
  assert.equal(
    link("Every project source file is checked."),
    "Every [project source file](#project-source-file) is checked."
  )
})

test("a plural use links as one phrase", () => {
  assert.equal(
    link("All source files are selected."),
    "All [source files](#source-file) are selected."
  )
})

test("a term wrapped across a line break still links", () => {
  assert.equal(
    link("A project source\nfile is selected."),
    "A [project source\nfile](#project-source-file) is selected."
  )
})

test("code spans and existing links are left verbatim", () => {
  assert.equal(
    link("Compare `source file` with [source file](#source-file)."),
    "Compare `source file` with [source file](#source-file)."
  )
})

test("an entry does not link its own term", () => {
  const linkWithinModuleRole = linkTerms(anchors, Option.some("Module role"))

  assert.equal(
    linkWithinModuleRole("A module role is derived from contents."),
    "A module role is derived from contents."
  )
})

test("the audit counterpart reports exactly the unlinked terms", () => {
  assert.deepEqual(unlinked("A module role over a source file."), ["module role", "source file"])
  assert.deepEqual(unlinked("A [module role](#module-role) is content-derived."), [])
})
