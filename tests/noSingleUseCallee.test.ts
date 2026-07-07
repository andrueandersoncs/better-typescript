import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { noSingleUseCallee } from "../src/rules/noSingleUseCallee.js"
import type { Detection } from "../src/detectors/rule.js"
import { runRuleCheckOnProject } from "../src/detectors/report.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-single-use-callee")

const expectedMessage =
  "Avoid naming a function that is only called in one place."
const expectedHint =
  "This function has a single call site and is not passed by reference anywhere. " +
  "Inline its body at the call site to reduce indirection. If the function exists " +
  "for documentation, a comment at the call site conveys the same intent without " +
  "the abstraction cost."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "singleUseNonCurriedArrow",
    fileName: "src/cases.ts",
    line: 4,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "singleUseMultiLineArrow",
    fileName: "src/cases.ts",
    line: 9,
    column: 7,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "singleUseFunctionDeclaration",
    fileName: "src/cases.ts",
    line: 19,
    column: 10,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "curriedFunction",
    fileName: "src/allowed.ts",
    line: 4,
    column: 7
  },
  {
    name: "exportedFunction",
    fileName: "src/allowed.ts",
    line: 12,
    column: 14
  },
  {
    name: "multiUseFunction",
    fileName: "src/allowed.ts",
    line: 18,
    column: 7
  },
  {
    name: "passedAsArgument",
    fileName: "src/allowed.ts",
    line: 24,
    column: 7
  },
  {
    name: "objectPropertyValue",
    fileName: "src/allowed.ts",
    line: 29,
    column: 7
  },
  {
    name: "assignedToVariable",
    fileName: "src/allowed.ts",
    line: 34,
    column: 7
  },
  {
    name: "deadCode",
    fileName: "src/allowed.ts",
    line: 39,
    column: 7
  }
]

const runNoSingleUseCalleeFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runRuleCheckOnProject(noSingleUseCallee)(project))
    )
  )

  return projectElements.flat()
}

test("no-single-use-callee reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoSingleUseCalleeFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
