import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noAsyncFunctions } from "../src/rules/noAsyncFunctions.js"
import type { Finding } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-async-functions")

const message = "Avoid declaring functions as async."

const hint =
  "Model asynchronous work with Effect instead of async/await. To integrate with a " +
  "third-party library: wrap incoming promises with Effect.tryPromise; satisfy an " +
  "outgoing Promise-returning callback contract with a non-async function that " +
  "returns Effect.runPromise(effect)."

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "loadValue async function declaration",
    ruleId: "no-async-functions",
    fileName: "src/cases.ts",
    line: 1,
    column: 8,
    message,
    hint
  },
  {
    name: "fetchValue async arrow",
    ruleId: "no-async-functions",
    fileName: "src/cases.ts",
    line: 5,
    column: 27,
    message,
    hint
  },
  {
    name: "computeValue async function expression",
    ruleId: "no-async-functions",
    fileName: "src/cases.ts",
    line: 9,
    column: 29,
    message,
    hint
  },
  {
    name: "Service.start async method",
    ruleId: "no-async-functions",
    fileName: "src/cases.ts",
    line: 14,
    column: 3,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "loadValue returns Effect",
    fileName: "src/allowed.ts",
    line: 3,
    column: 1
  },
  {
    name: "fetchValue returns Effect",
    fileName: "src/allowed.ts",
    line: 7,
    column: 27
  },
  {
    name: "computeValue plain function expression returning Promise",
    fileName: "src/allowed.ts",
    line: 9,
    column: 29
  },
  {
    name: "Service.start returns Effect",
    fileName: "src/allowed.ts",
    line: 13,
    column: 3
  }
]

const runNoAsyncFunctionsFixture = async (): Promise<
  ReadonlyArray<Finding>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([noAsyncFunctions])(project)
  )
}

test("no-async-functions reports disallowed and permits allowed fixture items", async () => {
  const matches = await runNoAsyncFunctionsFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
