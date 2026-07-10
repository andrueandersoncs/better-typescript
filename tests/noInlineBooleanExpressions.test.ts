import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noInlineBooleanExpressions } from "../src/checks/noInlineBooleanExpressions.js"
import type { Detection } from "../src/engine/check.js"
import { runCheckOnProject } from "../src/engine/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(
  testDirectory,
  "fixtures",
  "no-inline-boolean-expressions"
)
const expectedMessage =
  "Avoid boolean operators inline in an if statement condition."
const expectedHint =
  "Extract the expression into a well-named const variable declaration above the if " +
  "statement and use that variable in the if condition."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "requiresBoth.condition",
    fileName: "src/cases.ts",
    line: 4,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "allowsEither.condition",
    fileName: "src/cases.ts",
    line: 12,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "unwrapsParenthesized.condition",
    fileName: "src/cases.ts",
    line: 20,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "ignoresExtractedCondition.condition",
    fileName: "src/allowed.ts",
    line: 6,
    column: 7
  },
  {
    name: "ignoresSingleCondition.condition",
    fileName: "src/allowed.ts",
    line: 14,
    column: 7
  },
  {
    name: "ignoresComparison.condition",
    fileName: "src/allowed.ts",
    line: 22,
    column: 7
  }
]

const runNoInlineBooleanExpressionsFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noInlineBooleanExpressions)(project))
    )
  )

  return projectElements.flat()
}

test("no-inline-boolean-expressions reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoInlineBooleanExpressionsFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
