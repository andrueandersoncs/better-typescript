import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "../src/project/loadProject.js"
import { preferEffectSchemaGuard } from "../src/rules/preferEffectSchemaGuard.js"
import type { Finding } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedRuleMatch,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(
  testDirectory,
  "fixtures",
  "prefer-effect-schema-guard"
)

const message = (key: string, obj: string): string =>
  `Avoid using ${key} in ${obj} as a type guard.`

const hint = (obj: string): string =>
  `Define an Effect Schema for this value and replace the check with Schema.is($schema)(${obj}).`

const disallowedFixtureItems: ReadonlyArray<ExpectedRuleMatch> = [
  {
    name: "hasRole.roleInValue",
    ruleId: "prefer-effect-schema-guard",
    fileName: "src/cases.ts",
    line: 5,
    column: 7,
    message: message('"role"', "value"),
    hint: hint("value")
  },
  {
    name: "hasBoth.idInValue",
    ruleId: "prefer-effect-schema-guard",
    fileName: "src/cases.ts",
    line: 13,
    column: 7,
    message: message('"id"', "value"),
    hint: hint("value")
  },
  {
    name: "hasBoth.nameInValue",
    ruleId: "prefer-effect-schema-guard",
    fileName: "src/cases.ts",
    line: 13,
    column: 24,
    message: message('"name"', "value"),
    hint: hint("value")
  },
  {
    name: "hasTag.tagInValue",
    ruleId: "prefer-effect-schema-guard",
    fileName: "src/cases.ts",
    line: 21,
    column: 7,
    message: message("`tag`", "value"),
    hint: hint("value")
  },
  {
    name: "hasKind.kindInValue",
    ruleId: "prefer-effect-schema-guard",
    fileName: "src/cases.ts",
    line: 29,
    column: 7,
    message: message('"kind"', "value"),
    hint: hint("value")
  },
  {
    name: "guarded.statusInValue",
    ruleId: "prefer-effect-schema-guard",
    fileName: "src/cases.ts",
    line: 37,
    column: 15,
    message: message('"status"', "value"),
    hint: hint("value")
  }
]

const allowedFixtureItems: ReadonlyArray<FixtureItem> = [
  {
    name: "hasDynamicKey.keyInValue",
    fileName: "src/allowed.ts",
    line: 5,
    column: 6
  },
  {
    name: "hasIndex.zeroInValue",
    fileName: "src/allowed.ts",
    line: 13,
    column: 6
  },
  {
    name: "isDate.valueInstanceof",
    fileName: "src/allowed.ts",
    line: 21,
    column: 6
  },
  {
    name: "isActive.valueDotActive",
    fileName: "src/allowed.ts",
    line: 29,
    column: 6
  },
  {
    name: "isPerson.schemaIs",
    fileName: "src/allowed.ts",
    line: 38,
    column: 7
  }
]

const runFixture = async (): Promise<ReadonlyArray<Finding>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  return workspace.projects.flatMap((project) =>
    runRules([preferEffectSchemaGuard])(project)
  )
}

test("prefer-effect-schema-guard reports disallowed and permits allowed fixture items", async () => {
  const matches = await runFixture()

  assertDisallowedFixtureItems(matches, disallowedFixtureItems)
  assertAllowedFixtureItems(matches, allowedFixtureItems)
})
