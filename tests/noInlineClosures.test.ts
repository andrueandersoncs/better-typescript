import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noInlineClosures } from "@better-typescript/checks/noInlineClosures"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-inline-closures")
const expectedMessage =
  "Avoid arrow functions outside naming, currying, and third-party callback positions."
const expectedHint =
  "Name this function as a top-level const and pass it by reference, currying it when it " +
  "needs values from the enclosing scope. Inline arrows are permitted only as arguments " +
  "to third-party functions (effect combinators, node_modules callbacks). When the " +
  "expression sequences several steps, prefer a generator (Option.gen or Effect.gen) " +
  "over nesting functions."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "callArgument",
    fileName: "src/cases.ts",
    line: 5,
    column: 26,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "objectPropertyValue",
    fileName: "src/cases.ts",
    line: 8,
    column: 30,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "arrayElement",
    fileName: "src/cases.ts",
    line: 11,
    column: 26,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "returnedArrow",
    fileName: "src/cases.ts",
    line: 15,
    column: 22,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "conditionalBranch.true",
    fileName: "src/cases.ts",
    line: 20,
    column: 30,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "conditionalBranch.false",
    fileName: "src/cases.ts",
    line: 20,
    column: 49,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "externalArgs.defaultLibMap",
    fileName: "src/externalArgs.ts",
    line: 23,
    column: 34,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "externalArgs.firstPartyRun",
    fileName: "src/externalArgs.ts",
    line: 27,
    column: 38,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "namedConstArrow",
    fileName: "src/allowed.ts",
    line: 4,
    column: 32
  },
  {
    name: "curriedOuter",
    fileName: "src/allowed.ts",
    line: 7,
    column: 25
  },
  {
    name: "curriedInner",
    fileName: "src/allowed.ts",
    line: 7,
    column: 48
  },
  {
    name: "parenthesizedConstArrow",
    fileName: "src/allowed.ts",
    line: 10,
    column: 32
  },
  {
    name: "satisfiesWrappedConstArrow",
    fileName: "src/allowed.ts",
    line: 13,
    column: 24
  },
  {
    name: "externalArgs.effectArrayMap",
    fileName: "src/externalArgs.ts",
    line: 7,
    column: 34
  },
  {
    name: "externalArgs.optionMatchOnNone",
    fileName: "src/externalArgs.ts",
    line: 12,
    column: 14
  },
  {
    name: "externalArgs.optionMatchOnSome",
    fileName: "src/externalArgs.ts",
    line: 13,
    column: 15
  },
  {
    name: "externalArgs.pipeStageArrayMap",
    fileName: "src/externalArgs.ts",
    line: 19,
    column: 17
  }
]

const runNoInlineClosuresFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noInlineClosures)(project))
    )
  )

  return projectElements.flat()
}

test("no-inline-closures reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoInlineClosuresFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
