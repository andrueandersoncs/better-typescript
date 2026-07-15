import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferDataLastModule } from "@better-typescript/checks/preferDataLastModule"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-data-last-module")

const messageFor = (functionName: string, dataStructureName: string, modulePath: string): string =>
  `Avoid defining ${functionName} outside ${modulePath} when its last parameter is ${dataStructureName}.`

const hintFor = (functionName: string, dataStructureName: string, modulePath: string): string =>
  `Move ${functionName} under ${modulePath} so data-last functions for ${dataStructureName} ` +
  `stay in the model's concept directory, beside rather than inside its dedicated data file.`

const userModulePath = "src/modules"
const organizationModulePath = "src/modules"

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "updateUser",
    fileName: "src/cases.ts",
    line: 13,
    column: 7,
    message: messageFor("updateUser", "User", userModulePath),
    hint: hintFor("updateUser", "User", userModulePath)
  },
  {
    name: "archiveUser",
    fileName: "src/cases.ts",
    line: 18,
    column: 10,
    message: messageFor("archiveUser", "User", userModulePath),
    hint: hintFor("archiveUser", "User", userModulePath)
  },
  {
    name: "saveUser",
    fileName: "src/cases.ts",
    line: 22,
    column: 7,
    message: messageFor("saveUser", "User", userModulePath),
    hint: hintFor("saveUser", "User", userModulePath)
  },
  {
    name: "renameUser",
    fileName: "src/cases.ts",
    line: 24,
    column: 7,
    message: messageFor("renameUser", "User", userModulePath),
    hint: hintFor("renameUser", "User", userModulePath)
  },
  {
    name: "updateOrganization",
    fileName: "src/cases.ts",
    line: 31,
    column: 7,
    message: messageFor("updateOrganization", "Organization", organizationModulePath),
    hint: hintFor("updateOrganization", "Organization", organizationModulePath)
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "parseAge",
    fileName: "src/cases.ts",
    line: 39,
    column: 7
  },
  {
    name: "countUsers",
    fileName: "src/cases.ts",
    line: 41,
    column: 7
  },
  {
    name: "inspectOption",
    fileName: "src/cases.ts",
    line: 43,
    column: 7
  },
  {
    name: "normalizeUserName",
    fileName: "src/cases.ts",
    line: 46,
    column: 7
  },
  {
    name: "registerHandler",
    fileName: "src/cases.ts",
    line: 48,
    column: 7
  },
  {
    name: "module.updateUser",
    fileName: "src/modules/userOperations.ts",
    line: 3,
    column: 14
  },
  {
    name: "module.renameUser",
    fileName: "src/modules/userOperations.ts",
    line: 8,
    column: 14
  }
]

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(preferDataLastModule)(project))
    )
  )

  return projectElements.flat()
}

test("prefer-data-last-module reports misplaced data-last functions", async () => {
  const signals = await runFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems, { sort: true })
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
