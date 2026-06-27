import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferDataLastModule } from "../src/rules/preferDataLastModule.js"
import type { RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-data-last-module")

const messageFor = (functionName: string, dataStructureName: string, modulePath: string): string =>
  `Avoid defining ${functionName} outside ${modulePath} when its last parameter is ${dataStructureName}.`

const hintFor = (functionName: string, dataStructureName: string, modulePath: string): string =>
  `Move ${functionName} to ${modulePath} so data-last functions for ${dataStructureName} ` +
  `live with the ${dataStructureName} data structure.`

const userModulePath = "modules/user.ts"
const organizationModulePath = "modules/organization.ts"

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "updateUser",
    ruleId: "prefer-data-last-module",
    fileName: "src/cases.ts",
    line: 14,
    column: 7,
    message: messageFor("updateUser", "User", userModulePath),
    hint: hintFor("updateUser", "User", userModulePath)
  },
  {
    name: "archiveUser",
    ruleId: "prefer-data-last-module",
    fileName: "src/cases.ts",
    line: 19,
    column: 10,
    message: messageFor("archiveUser", "User", userModulePath),
    hint: hintFor("archiveUser", "User", userModulePath)
  },
  {
    name: "saveUser",
    ruleId: "prefer-data-last-module",
    fileName: "src/cases.ts",
    line: 23,
    column: 7,
    message: messageFor("saveUser", "User", userModulePath),
    hint: hintFor("saveUser", "User", userModulePath)
  },
  {
    name: "renameUser",
    ruleId: "prefer-data-last-module",
    fileName: "src/cases.ts",
    line: 25,
    column: 7,
    message: messageFor("renameUser", "User", userModulePath),
    hint: hintFor("renameUser", "User", userModulePath)
  },
  {
    name: "updateOrganization",
    ruleId: "prefer-data-last-module",
    fileName: "src/cases.ts",
    line: 30,
    column: 7,
    message: messageFor("updateOrganization", "Organization", organizationModulePath),
    hint: hintFor("updateOrganization", "Organization", organizationModulePath)
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "parseAge",
    fileName: "src/cases.ts",
    line: 35,
    column: 7
  },
  {
    name: "countUsers",
    fileName: "src/cases.ts",
    line: 37,
    column: 7
  },
  {
    name: "inspectOption",
    fileName: "src/cases.ts",
    line: 39,
    column: 7
  },
  {
    name: "normalizeUserName",
    fileName: "src/cases.ts",
    line: 41,
    column: 7
  },
  {
    name: "registerHandler",
    fileName: "src/cases.ts",
    line: 43,
    column: 7
  },
  {
    name: "module.updateUser",
    fileName: "src/modules/user.ts",
    line: 6,
    column: 14
  },
  {
    name: "module.renameUser",
    fileName: "src/modules/user.ts",
    line: 11,
    column: 14
  }
]

const runFixture = async (): Promise<ReadonlyArray<RuleMatch>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) => runRules(project, [preferDataLastModule]))
}

test("prefer-data-last-module reports misplaced data-last functions", async () => {
  const matches = await runFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems, { sort: true })
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
