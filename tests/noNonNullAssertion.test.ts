import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { noNonNullAssertion } from "@better-typescript/checks/noNonNullAssertion"
import type { Detection } from "@better-typescript/core/engine/location/data"
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
  "no-non-null-assertion"
)

const expectedMessage = "Avoid non-null assertions."

const expectedHint =
  "The ! operator silences the type checker instead of handling the absent case, " +
  "trading a compile-time proof for a runtime crash. Convert the nullable value " +
  "with Option.fromNullable and handle both branches (Option.match, " +
  "Option.getOrElse), or narrow it with a type guard the checker verifies."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "bare non-null assertion",
    fileName: "src/cases.ts",
    line: 7,
    column: 25,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "non-null assertion feeding a call",
    fileName: "src/cases.ts",
    line: 9,
    column: 26,
    message: expectedMessage,
    hint: expectedHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "Option.fromNullable conversion",
    fileName: "src/allowed.ts",
    line: 9,
    column: 19
  },
  {
    name: "Option.getOrElse handling",
    fileName: "src/allowed.ts",
    line: 11,
    column: 28
  }
]

const runNoNonNullAssertionFixture = async (): Promise<
  ReadonlyArray<Detection>
> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(noNonNullAssertion)(project))
    )
  )

  return projectElements.flat()
}

test("no-non-null-assertion reports disallowed and permits allowed fixture items", async () => {
  const signals = await runNoNonNullAssertionFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
