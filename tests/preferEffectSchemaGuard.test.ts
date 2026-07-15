import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { preferEffectSchemaGuard } from "@better-typescript/checks/preferEffectSchemaGuard"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { runCheckOnProject } from "@better-typescript/core/engine/report"
import {
  assertAllowedFixtureItems,
  assertDisallowedFixtureItems,
  type ExpectedDetection,
  type FixtureItem
} from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "prefer-effect-schema-guard")

const message = (key: string, obj: string): string =>
  `Avoid using ${key} in ${obj} as a type guard.`

const hint = (obj: string): string =>
  `Define an Effect Schema for this value and replace the check with Schema.is($schema)(${obj}).`

const disallowedFixtureItems: ReadonlyArray<ExpectedDetection> = [
  {
    name: "hasRole.roleInValue",
    fileName: "src/cases.ts",
    line: 5,
    column: 7,
    message: message('"role"', "value"),
    hint: hint("value")
  },
  {
    name: "hasBoth.idInValue",
    fileName: "src/cases.ts",
    line: 13,
    column: 7,
    message: message('"id"', "value"),
    hint: hint("value")
  },
  {
    name: "hasBoth.nameInValue",
    fileName: "src/cases.ts",
    line: 13,
    column: 24,
    message: message('"name"', "value"),
    hint: hint("value")
  },
  {
    name: "hasTag.tagInValue",
    fileName: "src/cases.ts",
    line: 21,
    column: 7,
    message: message("`tag`", "value"),
    hint: hint("value")
  },
  {
    name: "hasKind.kindInValue",
    fileName: "src/cases.ts",
    line: 29,
    column: 7,
    message: message('"kind"', "value"),
    hint: hint("value")
  },
  {
    name: "guarded.statusInValue",
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

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(preferEffectSchemaGuard)(project))
    )
  )

  return projectElements.flat()
}

test("prefer-effect-schema-guard reports disallowed and permits allowed fixture items", async () => {
  const signals = await runFixture()

  assertDisallowedFixtureItems(signals, disallowedFixtureItems)
  assertAllowedFixtureItems(signals, allowedFixtureItems)
})
