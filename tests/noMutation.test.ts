import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noMutation } from "../src/rules/noMutation.js"
import type { Finding } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-mutation")

const message = "Avoid mutating first-party data."

const hint =
  "Match the fix to the scale of the state. Local data: derive a new value — " +
  "Array.replace or Array.modify for elements, Struct.evolve for record fields, a " +
  "fresh const for rebindings. Shared, long-lived state (module-scope bindings, " +
  "closure-captured cells, subscriber registries): do not patch the assignment — move " +
  "the state into the Effect runtime, holding it in a Ref (SynchronizedRef under " +
  "contention, PubSub for subscriber sets); when a whole file manages state this way, " +
  "invert the module into Effect behind a Layer with one runtime entry at the " +
  "boundary. Never mutate built-ins (prototypes, globals). Mutating a third-party " +
  "structure whose API contract requires assignment (process.exitCode, a WebSocket " +
  "handler slot, a React ref cell) is permitted."

const expectedMatch = (
  name: string,
  line: number,
  column: number
): ExpectedRuleMatch => ({
  name,
  fileName: "src/cases.ts",
  line,
  column,
  ruleId: "no-mutation",
  message,
  hint
})

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  expectedMatch("property assignment", 14, 1),
  expectedMatch("compound property assignment", 15, 1),
  expectedMatch("element assignment", 16, 1),
  expectedMatch("nested element assignment", 17, 1),
  expectedMatch("postfix increment", 18, 1),
  expectedMatch("prefix decrement", 19, 3),
  expectedMatch("delete property", 20, 8),
  expectedMatch("logical assignment", 21, 1),
  expectedMatch("rebinding a project-declared let", 25, 1),
  expectedMatch("rebinding a parameter", 28, 63),
  expectedMatch("mutating a built-in prototype", 31, 1)
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Array.replace derives a new array",
    fileName: "src/allowed.ts",
    line: 8,
    column: 23
  },
  {
    name: "Array.modify derives a new array",
    fileName: "src/allowed.ts",
    line: 12,
    column: 24
  },
  {
    name: "comparison operator is not an assignment",
    fileName: "src/allowed.ts",
    line: 15,
    column: 23
  },
  {
    name: "arithmetic operator is not an assignment",
    fileName: "src/allowed.ts",
    line: 17,
    column: 22
  },
  {
    name: "logical not does not write to its operand",
    fileName: "src/allowed.ts",
    line: 20,
    column: 25
  },
  {
    name: "unary minus does not write to its operand",
    fileName: "src/allowed.ts",
    line: 22,
    column: 26
  },
  {
    name: "host-environment handler slot mutation is exempt",
    fileName: "src/allowed.ts",
    line: 27,
    column: 1
  },
  {
    name: "import-alias third-party mutation is exempt",
    fileName: "src/allowed.ts",
    line: 30,
    column: 56
  },
  {
    name: "third-party value in a first-party binding is exempt",
    fileName: "src/allowed.ts",
    line: 36,
    column: 43
  }
]

const runNoMutationFixture = async (): Promise<ReadonlyArray<Finding>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([noMutation])(project)
  )
}

test("no-mutation reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoMutationFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})

test("no-mutation classifies each match with a scope facet", async () => {
  const matches = await runNoMutationFixture()
  const facetsByLine = new Map(
    matches
      .filter((match) => match.path === "src/cases.ts")
      .map((match) => [match.line, match.facets])
  )

  assert.deepEqual(facetsByLine.get(14), ["shared-state"])
  assert.deepEqual(facetsByLine.get(16), ["shared-state"])
  assert.deepEqual(facetsByLine.get(20), ["shared-state"])
  assert.deepEqual(facetsByLine.get(25), ["shared-state"])
  assert.deepEqual(facetsByLine.get(28), ["local"])
  assert.deepEqual(facetsByLine.get(31), ["builtin"])
})
