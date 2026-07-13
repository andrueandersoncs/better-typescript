import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { passThroughWrappers } from "@better-typescript/checks/architectureExplore/passThroughWrappers"
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
  "pass-through-wrappers"
)
const expectedMessage =
  "This Module is a Pass-through Wrapper — it only re-exports another Module."
const expectedHint =
  "Collapse the re-export into the defining Module, or give this Module real depth " +
  "behind a smaller interface so the deletion test would concentrate complexity here."

const forwardingMessage =
  "This export is a Pass-through Wrapper — it only forwards a single call."
const forwardingHint =
  "Inline the forwarder at its call sites, or deepen the Module so the interface hides real behaviour."

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "export",
    fileName: "src/cases.ts",
    line: 1,
    column: 1,
    message: expectedMessage,
    hint: expectedHint
  },
  {
    name: "double",
    fileName: "src/cases.ts",
    line: 4,
    column: 14,
    message: forwardingMessage,
    hint: forwardingHint
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "add",
    fileName: "src/allowed.ts",
    line: 3,
    column: 14
  },
  {
    name: "total",
    fileName: "src/allowed.ts",
    line: 9,
    column: 14
  },
  {
    name: "push",
    fileName: "src/allowed.ts",
    line: 12,
    column: 14
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(passThroughWrappers)(project))
    )
  )

  return projectElements.flat()
}

test("pass-through-wrappers reports re-exports", async () => {
  const elements = await runFixture()
  assertDisallowedFixtureItems(elements, disallowedFixtureItems)
  assertAllowedFixtureItems(elements, allowedFixtureItems)
})
