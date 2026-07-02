import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noMutation } from "../src/rules/noMutation.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-mutation")

const message = "Avoid mutating state."

const hint =
  "Every binding and every data structure should be immutable. Derive a new value " +
  "instead of overwriting an existing one: Array.replace or Array.modify for array " +
  "elements, Struct.evolve for record fields, and a fresh const for rebindings. " +
  "Mutating a third-party object is permitted only where its API contract requires " +
  "assignment (for example process.exitCode)."

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
  expectedMatch("logical assignment", 21, 1)
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
    name: "lib-global third-party mutation is exempt",
    fileName: "src/allowed.ts",
    line: 25,
    column: 44
  },
  {
    name: "import-alias third-party mutation is exempt",
    fileName: "src/allowed.ts",
    line: 28,
    column: 57
  }
]

const runNoMutationFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
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
