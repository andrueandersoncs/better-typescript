import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noFirstPartySchemaDeclare } from "../src/rules/noFirstPartySchemaDeclare.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-first-party-schema-declare")

const hint =
  "Schema.declare is meant for integrating third-party types you do not control. " +
  "For types you own, define a proper Schema — for example class MyType extends " +
  'Schema.Class<MyType>("MyType")({ ... }) {} — which gives you validation, ' +
  "encoding, and decoding for free."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "Schema.declare with first-party type alias MyData",
    ruleId: "no-first-party-schema-declare",
    fileName: "src/cases.ts",
    line: 9,
    column: 22,
    message: 'Avoid Schema.declare for the first-party type "MyData".',
    hint
  },
  {
    name: "Schema.declare with first-party interface AppConfig",
    ruleId: "no-first-party-schema-declare",
    fileName: "src/cases.ts",
    line: 20,
    column: 25,
    message: 'Avoid Schema.declare for the first-party type "AppConfig".',
    hint
  },
  {
    name: "Schema.declare with inline predicate for first-party type MyData",
    ruleId: "no-first-party-schema-declare",
    fileName: "src/cases.ts",
    line: 23,
    column: 22,
    message: 'Avoid Schema.declare for the first-party type "MyData".',
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Schema.declare for third-party type ts.Node",
    fileName: "src/allowed.ts",
    line: 8,
    column: 22
  },
  {
    name: "Schema.declare for third-party type ts.Program",
    fileName: "src/allowed.ts",
    line: 13,
    column: 25
  },
  {
    name: "Schema.declare for first-party function type MyHandler",
    fileName: "src/allowed.ts",
    line: 21,
    column: 25
  }
]

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [noFirstPartySchemaDeclare]))
}

test("no-first-party-schema-declare reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
