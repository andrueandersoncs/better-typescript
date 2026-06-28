import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noDataTaggedClass } from "../src/rules/noDataTaggedClass.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-data-tagged-class")

const message = "Avoid Data.TaggedClass — use Schema.TaggedClass instead."

const hint =
  "Schema.TaggedClass provides the same tagged-class features as Data.TaggedClass " +
  "plus Schema validation, encoding, decoding, and Schema.is() type guards."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "Data.TaggedClass with simple tag",
    ruleId: "no-data-tagged-class",
    fileName: "src/cases.ts",
    line: 4,
    column: 14,
    message,
    hint
  },
  {
    name: "Data.TaggedClass with multiple fields",
    ruleId: "no-data-tagged-class",
    fileName: "src/cases.ts",
    line: 9,
    column: 14,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Schema.TaggedClass is allowed",
    fileName: "src/allowed.ts",
    line: 4,
    column: 14
  },
  {
    name: "Schema.TaggedError is allowed",
    fileName: "src/allowed.ts",
    line: 9,
    column: 14
  },
  {
    name: "Schema.Class is allowed",
    fileName: "src/allowed.ts",
    line: 15,
    column: 14
  }
]

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules(project, [noDataTaggedClass])
  )
}

test("no-data-tagged-class reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
