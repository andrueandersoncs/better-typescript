import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Array, Effect, HashMap, HashSet, Option } from "effect"
import { conceptControl } from "@better-typescript/guidance/policies/conceptControl"
import { buildConceptIndex } from "@better-typescript/matchers/builtins/conceptControl/conceptIndex"
import { referenceKey } from "@better-typescript/matchers/support/referenceKey"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { ProgramContext } from "@better-typescript/matchers/sources/data"
import { loadProject, runPolicyOnProject } from "@better-typescript/core/project/loadProject"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "concept-control")

const kindOf = (element: Detection): string | undefined => {
  const data = element.data

  if (typeof data !== "object" || data === null || !("kind" in data)) {
    return undefined
  }

  const kind = data.kind

  return typeof kind === "string" ? kind : undefined
}

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projects = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runPolicyOnProject(Array.of(conceptControl))(project))
    )
  )

  return projects.flat()
}

const loadConceptIndex = async () => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const project = workspace.projects[0]

  assert.ok(project, "concept-control fixture project was not loaded")

  return buildConceptIndex(
    ProgramContext.make({
      program: project.program,
      checker: project.program.getTypeChecker(),
      projectRoot: project.rootPath,
      workspaceRoot: project.rootPath
    })
  )
}

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

test("concept index recognizes Effect v4 data classes without spelling false positives", async () => {
  const index = await loadConceptIndex()

  const entryNamed = (name: string) => {
    const entry = index.dataStructures.find((candidate) => candidate.name === name)

    assert.ok(entry, `missing concept entry for ${name}`)

    return entry
  }

  const rolesFor = (name: string) => {
    const entry = entryNamed(name)
    const roles = HashMap.get(index.rolesByData, referenceKey(entry.symbol))

    assert.ok(Option.isSome(roles), `missing concept roles for ${name}`)

    return roles.value
  }

  const recognized = Array.make(
    "PrimaryDataError",
    "SecondaryDataError",
    "PrimarySchemaError",
    "SecondarySchemaError",
    "PrimaryOpaque",
    "SecondaryOpaque",
    "PrimaryAsClass",
    "SecondaryAsClass",
    "BaseModel",
    "PrimaryExtended",
    "SecondaryExtended"
  )

  Array.forEach(recognized, (name) => {
    entryNamed(name)
  })

  const indexedNames = index.dataStructures.map((entry) => entry.name)

  assert.equal(indexedNames.includes("FakePrimary"), false)
  assert.equal(indexedNames.includes("FakeSecondary"), false)

  const dataErrorRoles = rolesFor("PrimaryDataError")
  const schemaErrorRoles = rolesFor("PrimarySchemaError")
  const opaqueRoles = rolesFor("PrimaryOpaque")

  assert.equal(HashSet.has(dataErrorRoles, "protocol"), true)
  assert.equal(HashSet.has(schemaErrorRoles, "protocol"), true)
  assert.equal(HashSet.has(schemaErrorRoles, "boundary"), true)
  assert.equal(HashSet.has(opaqueRoles, "protocol"), false)

  Array.forEach(
    Array.make("PrimaryOpaque", "PrimaryAsClass", "BaseModel", "PrimaryExtended"),
    (name) => {
      assert.equal(HashSet.has(rolesFor(name), "boundary"), true)
    }
  )

  const inheritedDataErrorFields = entryNamed("PrimaryDataError").fieldSymbols.map((field) =>
    field.getName()
  )

  assert.equal(inheritedDataErrorFields.includes("cause"), false)
  assert.equal(inheritedDataErrorFields.includes("message"), false)
  assert.equal(inheritedDataErrorFields.includes("name"), false)
  assert.equal(inheritedDataErrorFields.includes("stack"), false)

  const schemaErrorFields = entryNamed("PrimarySchemaError").fieldSymbols.map((field) =>
    field.getName()
  )

  assert.equal(schemaErrorFields.includes("message"), true)
})
