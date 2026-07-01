import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noRootLevelClasses } from "../src/rules/noRootLevelClasses.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(
  testDirectory,
  "fixtures",
  "no-root-level-classes"
)

const message = "Avoid classes that do not extend another class."

const hint =
  "Classes should never implement data structures, algorithms, or modules — model those " +
  "with a functional approach (plain functions over Effect data types). The only sanctioned " +
  "use of a class is integrating with a third-party library that requires subclassing, so " +
  "every class must extend some other class as proof of that integration — for example " +
  "extending Effect's Schema.Class, Schema.TaggedError, Data.TaggedClass, or a base class " +
  "from the library you are integrating with."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "Container class declaration without heritage",
    ruleId: "no-root-level-classes",
    fileName: "src/cases.ts",
    line: 7,
    column: 14,
    message,
    hint
  },
  {
    name: "Person class declaration that only implements an interface",
    ruleId: "no-root-level-classes",
    fileName: "src/cases.ts",
    line: 11,
    column: 14,
    message,
    hint
  },
  {
    name: "Widget class declaration nested inside a function",
    ruleId: "no-root-level-classes",
    fileName: "src/cases.ts",
    line: 16,
    column: 9,
    message,
    hint
  },
  {
    name: "Anonymous class expression without heritage",
    ruleId: "no-root-level-classes",
    fileName: "src/cases.ts",
    line: 23,
    column: 26,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "DomainError extends Error",
    fileName: "src/allowed.ts",
    line: 7,
    column: 14
  },
  {
    name: "Person extends Schema.Class",
    fileName: "src/allowed.ts",
    line: 11,
    column: 14
  },
  {
    name: "NamedError extends Error and implements an interface",
    fileName: "src/allowed.ts",
    line: 15,
    column: 14
  },
  {
    name: "Anonymous class expression extends Error",
    fileName: "src/allowed.ts",
    line: 19,
    column: 26
  }
]

const runNoRootLevelClassesFixture = async (): Promise<
  ReadonlyArray<RuleMatch>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([noRootLevelClasses])(project)
  )
}

test("no-root-level-classes reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoRootLevelClassesFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
