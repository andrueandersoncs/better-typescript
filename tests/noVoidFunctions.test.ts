import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noVoidFunctions } from "../src/rules/noVoidFunctions.js"
import type { Detection } from "../src/detectors/rule.js"
import { runRuleCheckOnProject } from "../src/detectors/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-void-functions")

const message = "Avoid functions that return void."

const hint =
  "A void function either does nothing or performs a side-effect. If it does nothing, " +
  "delete it. If it performs a side-effect, make it return an Effect — for example wrap " +
  "the body in Effect.sync(() => ...) or Effect.gen so the side-effect is described, not " +
  "run. When a third-party API requires a void callback, annotate the value with that " +
  "API's callback type so the void contract is the consumer's, not yours."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "logMessage explicit void arrow",
    fileName: "src/cases.ts",
    line: 4,
    column: 27,
    message,
    hint
  },
  {
    name: "resetTotal explicit void function declaration",
    fileName: "src/cases.ts",
    line: 8,
    column: 17,
    message,
    hint
  },
  {
    name: "addToTotal inferred void arrow",
    fileName: "src/cases.ts",
    line: 12,
    column: 27,
    message,
    hint
  },
  {
    name: "noop anonymous void function expression",
    fileName: "src/cases.ts",
    line: 16,
    column: 21,
    message,
    hint
  },
  {
    name: "Counter.increment void method",
    fileName: "src/cases.ts",
    line: 21,
    column: 3,
    message,
    hint
  },
  {
    name: "bare.ping void method without contextual type",
    fileName: "src/contextualMethod.ts",
    line: 18,
    column: 3,
    message,
    hint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "increment returns number",
    fileName: "src/allowed.ts",
    line: 3,
    column: 27
  },
  {
    name: "fetchUser returns Effect",
    fileName: "src/allowed.ts",
    line: 5,
    column: 27
  },
  {
    name: "describe returns string",
    fileName: "src/allowed.ts",
    line: 7,
    column: 17
  },
  {
    name: "Box constructor",
    fileName: "src/allowed.ts",
    line: 13,
    column: 3
  },
  {
    name: "Box current setter",
    fileName: "src/allowed.ts",
    line: 21,
    column: 7
  },
  {
    name: "Box read returns number",
    fileName: "src/allowed.ts",
    line: 25,
    column: 3
  },
  {
    name: "useEffect callback void is imposed by EffectCallback contract",
    fileName: "src/allowed.ts",
    line: 42,
    column: 13
  },
  {
    name: "forEach-style callback void is imposed by the consumer",
    fileName: "src/allowed.ts",
    line: 66,
    column: 22
  },
  {
    name: "consoleLogger.log contextually typed object method",
    fileName: "src/contextualMethod.ts",
    line: 10,
    column: 3
  },
  {
    name: "any-returning handler slot permits a void implementation",
    fileName: "src/allowed.ts",
    line: 89,
    column: 64
  }
]

const runNoVoidFunctionsFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runRuleCheckOnProject(noVoidFunctions)(project))
    )
  )

  return projectElements.flat()
}

test("no-void-functions reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoVoidFunctionsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
