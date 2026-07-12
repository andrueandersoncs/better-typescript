import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferConditionalReturn } from "@better-typescript/checks/preferConditionalReturn"
import type { Detection } from "@better-typescript/core/engine/location"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
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
  "prefer-conditional-return"
)
const expectedMessage =
  "Avoid if statements that only choose between two return values."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "earlyReturn.if",
    fileName: "src/cases.ts",
    line: 4,
    column: 3,
    message: expectedMessage,
    hint: 'Return a conditional expression instead: return (ready) ? "yes" : "no".'
  },
  {
    name: "ifElseReturn.if",
    fileName: "src/cases.ts",
    line: 11,
    column: 3,
    message: expectedMessage,
    hint: 'Return a conditional expression instead: return (score > 0) ? "positive" : "non-positive".'
  },
  {
    name: "negatedCondition.if",
    fileName: "src/cases.ts",
    line: 19,
    column: 3,
    message: expectedMessage,
    hint: 'Return a conditional expression instead: return (ready) ? "open" : "blocked".'
  },
  {
    name: "bracelessThen.if",
    fileName: "src/cases.ts",
    line: 26,
    column: 3,
    message: expectedMessage,
    hint: "Return a conditional expression instead: return (active) ? 1 : 0."
  },
  {
    name: "chooseVars.if",
    fileName: "src/cases.ts",
    line: 31,
    column: 3,
    message: expectedMessage,
    hint: "Return a conditional expression instead: return (useFirst) ? first : second."
  },
  {
    name: "ternaryBranch.label.if",
    fileName: "src/ternaryBranch.ts",
    line: 9,
    column: 3,
    message: expectedMessage,
    hint: 'Return a conditional expression instead: return (on) ? "on" : "off".'
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "elseIfChain.if",
    fileName: "src/allowed.ts",
    line: 4,
    column: 3
  },
  {
    name: "notAReturn.if",
    fileName: "src/allowed.ts",
    line: 13,
    column: 3
  },
  {
    name: "elseNotValueReturn.if",
    fileName: "src/allowed.ts",
    line: 21,
    column: 3
  },
  {
    name: "multiStatement.if",
    fileName: "src/allowed.ts",
    line: 30,
    column: 3
  },
  {
    name: "bareReturn.if",
    fileName: "src/allowed.ts",
    line: 38,
    column: 3
  },
  {
    name: "ternaryBranch.pick.if",
    fileName: "src/ternaryBranch.ts",
    line: 2,
    column: 3
  }
]

const runPreferConditionalReturnFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(preferConditionalReturn)(project))
    )
  )

  return projectElements.flat()
}

test("prefer-conditional-return reports disallowed and permits allowed fixture items", async () => {
  const signals = await runPreferConditionalReturnFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems, { sort: true })
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
